import { ObjectId, type Filter, type UpdateFilter } from "mongodb";
import { getCollection } from "@/lib/db";
import type {
  AIKnowledgeEmbedding,
  AIKnowledgeSearchResult,
  AIKnowledgeSourceType,
  Comment,
  KBArticle,
  RetrievalIndexHealth,
  Service,
  Ticket,
} from "@/types";
import { getOrCreateAISettings } from "@/lib/ai/settings-store";
import {
  generateEmbeddingMeta,
  generateEmbeddingsBatch,
  testEmbeddingConnection,
} from "@/lib/ai/embeddings";
import { embeddingModelId } from "@/lib/ai/provider-client";
import { htmlToText } from "@/lib/ai/html-to-text";
import { DimensionMismatchError } from "@/lib/ai/embedding-guard";
import { cosineSimilarity } from "@/lib/ai/vector-math";
import { rerankResults } from "@/lib/ai/rerank";
import {
  isQdrantConfigured,
  upsertQdrantPoints,
  deleteQdrantPoint,
  deleteQdrantByField,
  searchQdrant,
  ensureQdrantCollection,
  type QdrantPoint,
} from "@/lib/ai/qdrant";

const INDEX_COLLECTION = "ai_knowledge_embeddings";
const MAX_CONTENT_CHARS = 6000;

/**
 * Above this many vectors, local cosine (which loads every embedding into
 * memory per query) starts to cost real RAM/latency and the operator should
 * move to Qdrant. Used to warn in logs and surface a recommendation banner.
 */
export const LOCAL_COSINE_WARN_THRESHOLD = 5000;

// Guards against two full reindexes running at once (e.g. a double-click on
// "Reindex"). Single long-lived Node server, so a module flag is enough.
let reindexing = false;

/**
 * Every knowledge source except resolved tickets. Used by the retrieval-time
 * privacy gate: when `indexResolvedTickets` is off we restrict a non-scoped
 * search to these so previously indexed ticket content can never resurface.
 */
const NON_RESOLVED_SOURCE_TYPES: AIKnowledgeSourceType[] = [
  "kb",
  "service",
  "web_page",
  "file",
];

function truncate(text: string): string {
  return text.length > MAX_CONTENT_CHARS
    ? text.slice(0, MAX_CONTENT_CHARS)
    : text;
}

function buildEmbedText(title: string, content: string): string {
  return `${title}\n\n${content}`.trim();
}

/**
 * Embed a single source document and upsert it into the knowledge index.
 *
 * Returns `true` when the document was embedded and stored (or skipped because
 * it had no text), `false` when embedding failed. Per-item failures are logged
 * and swallowed so a single bad document never aborts an incremental save or a
 * full reindex; callers that track progress (e.g. reindex) use the boolean to
 * count. Provider misconfiguration is caught up front by the reindex preflight,
 * so a `false` here represents a genuine per-document failure, not a global one.
 */
export async function upsertKnowledgeEmbedding(params: {
  sourceType: AIKnowledgeSourceType;
  sourceId: string;
  title: string;
  content: string;
  /** For `web_page` chunks: the parent web source id, for bulk removal. */
  webSourceId?: string;
  /** For `web_page` chunks: the page URL the chunk came from. */
  url?: string;
  /** Owning site id; absent ⇒ Global. Inherited from the parent source. */
  siteId?: string;
}): Promise<boolean> {
  const title = params.title.trim();
  const content = truncate(params.content.trim());
  if (!title && !content) return true;

  const embedText = buildEmbedText(title, content);
  let embedding: number[];
  let embeddingDim: number;
  let embeddingModel: string;
  try {
    const meta = await generateEmbeddingMeta(embedText);
    embedding = meta.vector;
    embeddingDim = meta.dim;
    embeddingModel = meta.model;
  } catch (error) {
    console.error(
      `[knowledge-index] embedding failed for ${params.sourceType}:${params.sourceId}`,
      error
    );
    return false;
  }

  const set: Partial<AIKnowledgeEmbedding> = {
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    title,
    content,
    embedding,
    embeddingDim,
    embeddingModel,
    updatedAt: new Date(),
  };
  if (params.webSourceId) set.webSourceId = params.webSourceId;
  if (params.url) set.url = params.url;
  if (params.siteId) set.siteId = params.siteId;

  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  // findOneAndUpdate returns the (upserted) doc so we get a stable _id to mirror
  // the same point into Qdrant.
  const doc = await col.findOneAndUpdate(
    { sourceType: params.sourceType, sourceId: params.sourceId },
    {
      $set: set,
      $setOnInsert: { _id: new ObjectId() },
    },
    { upsert: true, returnDocument: "after", projection: { _id: 1 } }
  );

  if (isQdrantConfigured() && doc?._id) {
    try {
      await upsertQdrantPoints([
        {
          mongoId: doc._id.toString(),
          vector: embedding,
          payload: {
            sourceType: params.sourceType,
            sourceId: params.sourceId,
            title,
            content,
            url: params.url,
            webSourceId: params.webSourceId,
            siteId: params.siteId,
          },
        },
      ]);
    } catch (error) {
      // Mongo is source of truth; a failed mirror is recoverable via resync.
      console.warn("[knowledge-index] qdrant upsert failed:", (error as Error).message);
    }
  }
  return true;
}

export async function removeKnowledgeEmbedding(
  sourceType: AIKnowledgeSourceType,
  sourceId: string
): Promise<void> {
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  const doc = await col.findOne(
    { sourceType, sourceId },
    { projection: { _id: 1 } }
  );
  await col.deleteOne({ sourceType, sourceId });
  if (doc?._id && isQdrantConfigured()) await deleteQdrantPoint(doc._id.toString());
}

/** Remove every `web_page` chunk belonging to a single web source. */
export async function removeWebSourceEmbeddings(
  webSourceId: string
): Promise<void> {
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  await col.deleteMany({ sourceType: "web_page", webSourceId });
  if (isQdrantConfigured()) await deleteQdrantByField("webSourceId", webSourceId);
}

/** Remove every `file` chunk belonging to a single uploaded file. */
export async function removeFileEmbeddings(fileId: string): Promise<void> {
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  await col.deleteMany({ sourceType: "file", fileId });
  if (isQdrantConfigured()) await deleteQdrantByField("fileId", fileId);
}

async function mirrorKnowledgeFilterToQdrant(
  filter: Filter<AIKnowledgeEmbedding>
): Promise<void> {
  if (!isQdrantConfigured()) return;

  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  const docs = await col
    .find(filter)
    .project<
      Pick<
        AIKnowledgeEmbedding,
        | "_id"
        | "sourceType"
        | "sourceId"
        | "title"
        | "content"
        | "embedding"
        | "url"
        | "webSourceId"
        | "fileId"
        | "siteId"
      >
    >({
      sourceType: 1,
      sourceId: 1,
      title: 1,
      content: 1,
      embedding: 1,
      url: 1,
      webSourceId: 1,
      fileId: 1,
      siteId: 1,
    })
    .toArray();

  const BATCH = 256;
  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs
      .slice(i, i + BATCH)
      .filter((d) => Array.isArray(d.embedding) && d.embedding.length > 0);
    if (batch.length === 0) continue;
    await upsertQdrantPoints(
      batch.map((d) => ({
        mongoId: d._id.toString(),
        vector: d.embedding,
        payload: {
          sourceType: d.sourceType,
          sourceId: d.sourceId,
          title: d.title,
          content: d.content,
          url: d.url,
          webSourceId: d.webSourceId,
          fileId: d.fileId,
          siteId: d.siteId,
        },
      }))
    );
  }
}

function scopeUpdate(siteId?: string): UpdateFilter<AIKnowledgeEmbedding> {
  const update: UpdateFilter<AIKnowledgeEmbedding> = {
    $set: { updatedAt: new Date() },
  };
  if (siteId) {
    update.$set = { ...update.$set, siteId };
  } else {
    update.$unset = { siteId: "" };
  }
  return update;
}

export async function updateWebSourceEmbeddingsSiteScope(
  webSourceId: string,
  siteId?: string
): Promise<void> {
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  const filter: Filter<AIKnowledgeEmbedding> = {
    sourceType: "web_page",
    webSourceId,
  };
  await col.updateMany(filter, scopeUpdate(siteId));
  await mirrorKnowledgeFilterToQdrant(filter).catch((error) => {
    console.warn(
      "[knowledge-index] qdrant web scope mirror failed:",
      (error as Error).message
    );
  });
}

export async function updateFileEmbeddingsSiteScope(
  fileId: string,
  siteId?: string
): Promise<void> {
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  const filter: Filter<AIKnowledgeEmbedding> = { sourceType: "file", fileId };
  await col.updateMany(filter, scopeUpdate(siteId));
  await mirrorKnowledgeFilterToQdrant(filter).catch((error) => {
    console.warn(
      "[knowledge-index] qdrant file scope mirror failed:",
      (error as Error).message
    );
  });
}

/**
 * Embed and store the chunks of one uploaded file as `file` rows. Embeddings
 * are batched (one provider call per ~96 chunks) so a large document indexes in
 * a handful of round-trips. Returns the number of chunks stored. Throws if the
 * embedding provider fails so the caller can mark the file failed.
 */
export async function indexFileChunks(params: {
  fileId: string;
  title: string;
  chunks: string[];
  /** Owning site id; absent ⇒ Global. Inherited from the parent file. */
  siteId?: string;
}): Promise<number> {
  const chunks = params.chunks.filter((c) => c.trim().length > 0);
  if (chunks.length === 0) return 0;

  const modelId = embeddingModelId(await getOrCreateAISettings());
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  const BATCH = 96;
  let stored = 0;

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const vectors = await generateEmbeddingsBatch(batch);
    const docs: AIKnowledgeEmbedding[] = batch.map((content, j) => ({
      _id: new ObjectId(),
      sourceType: "file",
      sourceId: `${params.fileId}:${i + j}`,
      title:
        chunks.length > 1
          ? `${params.title} (part ${i + j + 1})`
          : params.title,
      content,
      embedding: vectors[j],
      embeddingDim: vectors[j].length,
      embeddingModel: modelId,
      fileId: params.fileId,
      ...(params.siteId ? { siteId: params.siteId } : {}),
      updatedAt: new Date(),
    }));
    await col.insertMany(docs);

    if (isQdrantConfigured()) {
      try {
        await upsertQdrantPoints(
          docs.map((d) => ({
            mongoId: d._id.toString(),
            vector: d.embedding,
            payload: {
              sourceType: "file" as const,
              sourceId: d.sourceId,
              title: d.title,
              content: d.content,
              fileId: d.fileId,
              siteId: d.siteId,
            },
          }))
        );
      } catch (error) {
        console.warn("[knowledge-index] qdrant file upsert failed:", (error as Error).message);
      }
    }
    stored += docs.length;
  }
  return stored;
}

/**
 * Rebuild the entire Qdrant index from the embeddings already stored in Mongo
 * (the source of truth). No re-embedding — it copies existing vectors — so it's
 * cheap and used both for first-time backfill and after a full reindex. The
 * collection is recreated, which also resolves an embedding-dimension change.
 */
export async function syncQdrantFromMongo(): Promise<{ synced: number }> {
  if (!isQdrantConfigured()) {
    throw new Error("QDRANT_URL is not configured.");
  }
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  const first = await col.findOne(
    { embedding: { $exists: true, $ne: [] } },
    { projection: { embedding: 1 } }
  );
  if (!first || !Array.isArray(first.embedding) || first.embedding.length === 0) {
    return { synced: 0 };
  }
  const dim = first.embedding.length;
  await ensureQdrantCollection(dim, true); // recreate for a clean, authoritative state

  const cursor = col.find({}).project<AIKnowledgeEmbedding>({
    sourceType: 1,
    sourceId: 1,
    title: 1,
    content: 1,
    embedding: 1,
    url: 1,
    webSourceId: 1,
    fileId: 1,
    siteId: 1,
  });

  let batch: QdrantPoint[] = [];
  let synced = 0;
  const flush = async () => {
    if (batch.length === 0) return;
    await upsertQdrantPoints(batch);
    synced += batch.length;
    batch = [];
  };

  for await (const d of cursor) {
    // Skip vectors of a different dimensionality (e.g. left over from an old
    // embedding model) — they can't live in the same collection.
    if (!Array.isArray(d.embedding) || d.embedding.length !== dim) continue;
    batch.push({
      mongoId: d._id.toString(),
      vector: d.embedding,
      payload: {
        sourceType: d.sourceType,
        sourceId: d.sourceId,
        title: d.title,
        content: d.content,
        url: d.url,
        webSourceId: d.webSourceId,
        fileId: d.fileId,
        siteId: d.siteId,
      },
    });
    if (batch.length >= 256) await flush();
  }
  await flush();
  return { synced };
}

export interface SearchKnowledgeOptions {
  /** Restrict to specific knowledge sources (e.g. ["resolved_ticket"]). */
  sourceTypes?: AIKnowledgeSourceType[];
  /**
   * Scope to one site's knowledge. When set, results are limited to rows
   * owned by this site OR global rows (no `siteId`). Absent ⇒ no scoping.
   */
  siteId?: string;
}

/**
 * Mongo clause that scopes rows to the request's site OR global rows (those
 * without a `siteId`). Returns null when unscoped so callers can skip it.
 */
function siteScopeClause(
  siteId?: string
): Record<string, unknown> | null {
  if (!siteId) return null;
  return { $or: [{ siteId }, { siteId: { $exists: false } }] };
}

// Warn at most once a minute so a busy bot doesn't flood the logs.
let lastLargeScanWarnAt = 0;
function maybeWarnLargeLocalScan(count: number): void {
  if (count <= LOCAL_COSINE_WARN_THRESHOLD) return;
  const now = Date.now();
  if (now - lastLargeScanWarnAt < 60_000) return;
  lastLargeScanWarnAt = now;
  console.warn(
    `[knowledge-index] local cosine scanned ${count} vectors (> ` +
      `${LOCAL_COSINE_WARN_THRESHOLD}). This loads every embedding into memory ` +
      "per query — set QDRANT_URL and switch Vector Search to Qdrant for scale."
  );
}

async function localVectorCandidates(
  queryEmbedding: number[],
  topK: number,
  opts: SearchKnowledgeOptions
): Promise<AIKnowledgeSearchResult[]> {
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  const filter: Record<string, unknown> = {};
  if (opts.sourceTypes && opts.sourceTypes.length > 0) {
    filter.sourceType = { $in: opts.sourceTypes };
  }
  const scope = siteScopeClause(opts.siteId);
  if (scope) Object.assign(filter, scope);

  // Pass 1: pull only the vectors needed to score (skip large `content`/
  // `title` payloads). Embeddings dominate memory, but this still avoids
  // transferring/holding every document's full text.
  const lite = await col
    .find(filter)
    .project<Pick<AIKnowledgeEmbedding, "_id" | "embedding">>({
      embedding: 1,
    })
    .toArray();
  if (lite.length === 0) return [];
  maybeWarnLargeLocalScan(lite.length);

  const usable = lite.filter(
    (d) => Array.isArray(d.embedding) && d.embedding.length > 0
  );
  // Only compare embeddings of matching dimensionality. If the index was
  // built with a different model than is now configured, fail loudly so the
  // caller can surface "rebuild required" instead of returning nonsense.
  const sameDim = usable.filter(
    (d) => d.embedding.length === queryEmbedding.length
  );
  if (sameDim.length === 0 && usable.length > 0) {
    throw new DimensionMismatchError(
      usable[0].embedding.length,
      queryEmbedding.length
    );
  }

  const ranked = sameDim
    .map((d) => ({
      id: d._id,
      score: cosineSimilarity(queryEmbedding, d.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  if (ranked.length === 0) return [];

  // Pass 2: fetch full content only for the winners.
  const fullDocs = await col
    .find({ _id: { $in: ranked.map((r) => r.id) } })
    .project<
      Pick<
        AIKnowledgeEmbedding,
        "_id" | "sourceType" | "sourceId" | "title" | "content" | "url"
      >
    >({ sourceType: 1, sourceId: 1, title: 1, content: 1, url: 1 })
    .toArray();
  const byId = new Map(fullDocs.map((d) => [d._id.toString(), d]));

  return ranked
    .map((r): AIKnowledgeSearchResult | null => {
      const d = byId.get(r.id.toString());
      if (!d) return null;
      return {
        sourceType: d.sourceType,
        sourceId: d.sourceId,
        title: d.title,
        content: d.content,
        url: d.url,
        score: r.score,
      };
    })
    .filter((x): x is AIKnowledgeSearchResult => x !== null);
}

// A single text index powers the keyword (BM25-style) leg of hybrid search.
// `$text` is core MongoDB (works on self-hosted and Atlas alike), unlike
// `$search` which needs Atlas Search — so hybrid works in both modes.
let textIndexEnsured = false;
async function ensureTextIndex(): Promise<void> {
  if (textIndexEnsured) return;
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  try {
    await col.createIndex(
      { title: "text", content: "text" },
      { name: "knowledge_text_index", weights: { title: 3, content: 1 } }
    );
  } catch (error) {
    // A pre-existing text index with a different spec throws here; the keyword
    // leg can still use whatever text index exists, so don't fail the search.
    console.warn("[knowledge-index] ensureTextIndex:", (error as Error).message);
  }
  textIndexEnsured = true;
}

async function keywordCandidates(
  query: string,
  topK: number,
  opts: SearchKnowledgeOptions
): Promise<AIKnowledgeSearchResult[]> {
  await ensureTextIndex();
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  const match: Record<string, unknown> = { $text: { $search: query } };
  if (opts.sourceTypes && opts.sourceTypes.length > 0) {
    match.sourceType = { $in: opts.sourceTypes };
  }
  const scope = siteScopeClause(opts.siteId);
  if (scope) Object.assign(match, scope);
  return col
    .aggregate<AIKnowledgeSearchResult>([
      { $match: match },
      { $addFields: { score: { $meta: "textScore" } } },
      { $sort: { score: -1 } },
      { $limit: topK },
      {
        $project: {
          _id: 0,
          sourceType: 1,
          sourceId: 1,
          title: 1,
          content: 1,
          url: 1,
          score: 1,
        },
      },
    ])
    .toArray();
}

function resultKey(r: Pick<AIKnowledgeSearchResult, "sourceType" | "sourceId">) {
  return `${r.sourceType}::${r.sourceId}`;
}

/**
 * Reciprocal Rank Fusion. Merges ranked lists by position, not by raw score,
 * so a semantic-similarity list and a keyword-relevance list (whose scores are
 * on totally different scales) can be combined fairly. k=60 is the canonical
 * dampening constant from the original RRF paper.
 */
function rrfFuse(
  lists: AIKnowledgeSearchResult[][],
  k = 60
): AIKnowledgeSearchResult[] {
  const acc = new Map<
    string,
    { item: AIKnowledgeSearchResult; score: number }
  >();
  for (const list of lists) {
    list.forEach((item, rank) => {
      const key = resultKey(item);
      const inc = 1 / (k + rank + 1);
      const cur = acc.get(key);
      if (cur) cur.score += inc;
      else acc.set(key, { item, score: inc });
    });
  }
  return [...acc.values()]
    .sort((a, b) => b.score - a.score)
    .map((e) => ({ ...e.item, score: e.score }));
}

const RERANK_POOL = 12;

/**
 * Collapse near-identical passages that came from different sources (e.g. the
 * same text in a KB article and a crawled web page), keeping the highest-ranked
 * copy. Without this the agent can burn rerank slots / context on duplicates
 * and cite the same passage twice. Keyed on normalized content so trivial
 * whitespace/case differences still dedupe.
 */
function dedupeByContent(
  results: AIKnowledgeSearchResult[]
): AIKnowledgeSearchResult[] {
  const seen = new Set<string>();
  const out: AIKnowledgeSearchResult[] = [];
  for (const r of results) {
    // Full normalized content as the key: only genuinely identical passages
    // collapse, so a shared boilerplate intro can't drop a distinct passage.
    // Trivial cost at candidate-pool size (≤ a few dozen).
    const key = r.content.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

// Skip the reranker LLM call when the fused #1 already dominates #2 by this
// factor — a clear winner that reranking is very unlikely to change. Fail-safe:
// skipping just keeps fusion order, which is already the pre-rerank ranking.
const RERANK_DOMINANCE_RATIO = 2;
function hasClearWinner(fused: AIKnowledgeSearchResult[]): boolean {
  if (fused.length < 2) return true;
  const top = fused[0].score;
  const second = fused[1].score;
  if (second <= 0) return true;
  return top / second >= RERANK_DOMINANCE_RATIO;
}

export async function searchKnowledge(
  query: string,
  topK = 5,
  opts: SearchKnowledgeOptions = {}
): Promise<AIKnowledgeSearchResult[]> {
  const settings = await getOrCreateAISettings();
  const { vector: queryEmbedding } = await generateEmbeddingMeta(query);

  // Privacy gate: when resolved-ticket indexing is off, never return
  // `resolved_ticket` rows — including any indexed earlier and not yet purged.
  // This makes the setting an authoritative *retrieval* gate, not just an index
  // gate, so a stale copy in Mongo or Qdrant can't leak customer ticket content.
  let effectiveOpts = opts;
  if (!settings.agent.indexResolvedTickets) {
    if (opts.sourceTypes && opts.sourceTypes.length > 0) {
      const allowed = opts.sourceTypes.filter((t) => t !== "resolved_ticket");
      if (allowed.length === 0) return []; // caller asked only for resolved tickets
      effectiveOpts = { ...opts, sourceTypes: allowed };
    } else {
      effectiveOpts = { ...opts, sourceTypes: NON_RESOLVED_SOURCE_TYPES };
    }
  }

  // Pull a wider candidate pool than topK so fusion + reranking have material
  // to work with.
  const candidateK = Math.max(topK * 4, 20);

  let vectorList: AIKnowledgeSearchResult[];
  if (settings.vectorSearchMethod === "qdrant" && isQdrantConfigured()) {
    try {
      vectorList = await searchQdrant(
        queryEmbedding,
        candidateK,
        effectiveOpts.sourceTypes,
        effectiveOpts.siteId
      );
    } catch (error) {
      // e.g. collection not yet backfilled — fall back so search still works.
      console.warn(
        "[knowledge-index] qdrant search failed, falling back to local:",
        (error as Error).message
      );
      vectorList = await localVectorCandidates(queryEmbedding, candidateK, effectiveOpts);
    }
  } else {
    vectorList = await localVectorCandidates(queryEmbedding, candidateK, effectiveOpts);
  }

  let fused: AIKnowledgeSearchResult[];
  if ((settings.searchMode ?? "hybrid") === "hybrid") {
    let keywordList: AIKnowledgeSearchResult[] = [];
    try {
      keywordList = await keywordCandidates(query, candidateK, effectiveOpts);
    } catch (error) {
      // Keyword leg is best-effort; vector results alone are still valid.
      console.warn("[knowledge-index] keyword leg failed:", (error as Error).message);
    }
    fused =
      keywordList.length > 0 ? rrfFuse([vectorList, keywordList]) : vectorList;
  } else {
    fused = vectorList;
  }

  if (fused.length === 0) return [];

  // Drop cross-source duplicates before they consume rerank slots / context.
  fused = dedupeByContent(fused);

  // Rerank only when it can plausibly help: enabled, more than one candidate,
  // and no single candidate already dominates the fused ranking.
  if ((settings.rerankEnabled ?? true) && !hasClearWinner(fused)) {
    const pool = fused.slice(0, Math.max(topK, Math.min(fused.length, RERANK_POOL)));
    return rerankResults(query, pool, topK);
  }
  return fused.slice(0, topK);
}

/**
 * Cheap snapshot of index size + search backend, for the admin UI to warn when
 * local cosine is being pushed past the point it scales. Uses
 * `estimatedDocumentCount` (O(1) collection metadata), so it's safe to call on
 * page load.
 */
export async function getRetrievalIndexHealth(): Promise<RetrievalIndexHealth> {
  const settings = await getOrCreateAISettings();
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  const vectorCount = await col.estimatedDocumentCount();
  const method = settings.vectorSearchMethod;
  // "qdrant" only actually offloads when QDRANT_URL is set; otherwise search
  // falls back to local cosine, so for warning purposes we're still "local".
  const qdrantActive = method === "qdrant" && isQdrantConfigured();
  return {
    vectorCount,
    method,
    qdrantActive,
    warnThreshold: LOCAL_COSINE_WARN_THRESHOLD,
    recommendQdrant: !qdrantActive && vectorCount > LOCAL_COSINE_WARN_THRESHOLD,
  };
}

export interface ReindexResult {
  kb: number;
  services: number;
  resolvedTickets: number;
  /** Web-page chunks re-embedded in place (not re-crawled). */
  web: number;
  /** File chunks re-embedded in place (not re-parsed). */
  files: number;
  failed: number;
}

/** Request collections that can hold resolved tickets. */
const REQUEST_COLLECTIONS = [
  "tickets",
  "installation_requests",
  "customization_requests",
  "service_requests",
] as const;

function buildResolvedTicketContent(
  ticket: Pick<Ticket, "description" | "title">,
  comments: Pick<Comment, "content">[]
): string {
  const parts = [ticket.description?.trim() || ""];
  for (const c of comments) {
    const text = c.content?.trim();
    if (text) parts.push(text);
  }
  return parts.filter(Boolean).join("\n\n---\n\n");
}

async function fetchResolvedTicket(
  ticketId: string
): Promise<{ ticket: Ticket; collection: string } | null> {
  if (!ObjectId.isValid(ticketId)) return null;
  for (const name of REQUEST_COLLECTIONS) {
    const col = await getCollection<Ticket>(name);
    const ticket = await col.findOne({ _id: new ObjectId(ticketId) });
    if (ticket) return { ticket, collection: name };
  }
  return null;
}

async function publicCommentsFor(
  ticketId: string
): Promise<Pick<Comment, "content">[]> {
  const col = await getCollection<Comment>("comments");
  return col
    .find({ ticketId, isInternal: false })
    .project<Pick<Comment, "content">>({ content: 1 })
    .sort({ createdAt: 1 })
    .toArray();
}

/**
 * Index a single resolved ticket (description + public comments). Internal
 * comments are excluded so staff notes never leak to other customers.
 */
export async function upsertResolvedTicketEmbedding(
  ticketId: string
): Promise<void> {
  const settings = await getOrCreateAISettings();
  if (!settings.agent.indexResolvedTickets) return;

  const found = await fetchResolvedTicket(ticketId);
  if (!found || found.ticket.status !== "resolved") return;

  const comments = await publicCommentsFor(ticketId);
  await upsertKnowledgeEmbedding({
    sourceType: "resolved_ticket",
    sourceId: ticketId,
    title: `${found.ticket.ticketNumber ?? "Ticket"} — ${found.ticket.title}`,
    content: buildResolvedTicketContent(found.ticket, comments),
  });
}

export async function removeResolvedTicketEmbedding(
  ticketId: string
): Promise<void> {
  await removeKnowledgeEmbedding("resolved_ticket", ticketId);
}

/**
 * Purge every resolved-ticket embedding from both Mongo and Qdrant. Called when
 * an operator turns `indexResolvedTickets` off so previously indexed customer
 * ticket content stops being *retrievable*, not merely stops being *added*.
 */
export async function removeAllResolvedTicketEmbeddings(): Promise<void> {
  const col = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);
  await col.deleteMany({ sourceType: "resolved_ticket" });
  if (isQdrantConfigured()) {
    await deleteQdrantByField("sourceType", "resolved_ticket");
  }
}

export async function reindexAllKnowledge(): Promise<ReindexResult> {
  if (reindexing) throw new Error("A reindex is already in progress.");
  reindexing = true;
  try {
    return await runReindex();
  } finally {
    reindexing = false;
  }
}

/**
 * Atomic-ish reindex via build-then-prune.
 *
 * The old approach deleted all rebuilt rows up front, leaving a window where
 * the bot answered from an empty/partial index. Instead we now UPSERT every
 * live source in place — each upsert replaces its existing row, so a row is
 * never missing, only momentarily older — and only AFTER the rebuild do we
 * prune rows whose source no longer exists. At every instant the index has
 * either the previous or the new row for each source, never a gap.
 */
async function runReindex(): Promise<ReindexResult> {
  const result: ReindexResult = {
    kb: 0,
    services: 0,
    resolvedTickets: 0,
    web: 0,
    files: 0,
    failed: 0,
  };
  const settings = await getOrCreateAISettings();

  // Preflight: a missing model, bad base URL or unreachable provider fails for
  // *every* document. Probe once and abort BEFORE touching the index, so the
  // operator gets one actionable message (e.g. "Ollama embedding model not
  // set. Open AI Training → Settings.") instead of a churned index and one
  // error log per document.
  const probe = await testEmbeddingConnection();
  if (!probe.success) {
    throw new Error(
      probe.error ??
        "Embedding provider unavailable. Open AI Training → Settings."
    );
  }

  const indexCol = await getCollection<AIKnowledgeEmbedding>(INDEX_COLLECTION);

  // KB articles — upsert all published, remember which IDs are still live.
  const kbLiveIds: string[] = [];
  const kbCol = await getCollection<KBArticle>("kb_articles");
  const kbDocs = await kbCol
    .find({ isPublished: true })
    .project<KBArticle>({ title: 1, content: 1, excerpt: 1 })
    .toArray();

  for (const art of kbDocs) {
    const id = art._id.toString();
    kbLiveIds.push(id);
    try {
      const plain = htmlToText(art.content ?? "");
      const ok = await upsertKnowledgeEmbedding({
        sourceType: "kb",
        sourceId: id,
        title: art.title,
        content: art.excerpt ? `${art.excerpt}\n\n${plain}` : plain,
      });
      if (ok) result.kb++;
      else result.failed++;
    } catch {
      result.failed++;
    }
  }

  // Services
  const serviceLiveIds: string[] = [];
  const svcCol = await getCollection<Service>("services");
  const svcDocs = await svcCol
    .find({ isActive: true })
    .project<Service>({ name: 1, description: 1, slug: 1 })
    .toArray();

  for (const svc of svcDocs) {
    const description = svc.description?.trim() || "";
    if (!description) continue;
    const id = svc._id.toString();
    serviceLiveIds.push(id);
    try {
      const ok = await upsertKnowledgeEmbedding({
        sourceType: "service",
        sourceId: id,
        title: svc.name,
        content: description,
      });
      if (ok) result.services++;
      else result.failed++;
    } catch {
      result.failed++;
    }
  }

  // Resolved tickets (description + public comments). PII tradeoff accepted
  // by the operator; gated behind an explicit setting. When the setting is
  // off, ticketLiveIds stays empty so the prune below removes every one.
  const ticketLiveIds: string[] = [];
  if (settings.agent.indexResolvedTickets) {
    const commentsCol = await getCollection<Comment>("comments");
    for (const name of REQUEST_COLLECTIONS) {
      const col = await getCollection<Ticket>(name);
      const resolved = await col
        .find({ status: "resolved" })
        .project<Ticket>({
          title: 1,
          description: 1,
          ticketNumber: 1,
          status: 1,
        })
        .toArray();
      for (const t of resolved) {
        const id = t._id.toString();
        ticketLiveIds.push(id);
        try {
          const comments = await commentsCol
            .find({ ticketId: id, isInternal: false })
            .project<Pick<Comment, "content">>({ content: 1 })
            .sort({ createdAt: 1 })
            .toArray();
          const ok = await upsertKnowledgeEmbedding({
            sourceType: "resolved_ticket",
            sourceId: id,
            title: `${t.ticketNumber ?? "Ticket"} — ${t.title}`,
            content: buildResolvedTicketContent(t, comments),
          });
          if (ok) result.resolvedTickets++;
          else result.failed++;
        } catch {
          result.failed++;
        }
      }
    }
  }

  // Web pages and files: re-embed the stored text in place so existing crawls/
  // uploads keep matching after an embedding model/provider change (no re-crawl
  // or re-parse needed). These are managed by their own source lifecycle and
  // are never pruned here.
  const inPlaceDocs = await indexCol
    .find({ sourceType: { $in: ["web_page", "file"] } })
    .project<
      Pick<AIKnowledgeEmbedding, "_id" | "title" | "content" | "sourceType">
    >({ title: 1, content: 1, sourceType: 1 })
    .toArray();

  for (const doc of inPlaceDocs) {
    try {
      const meta = await generateEmbeddingMeta(
        buildEmbedText(doc.title, doc.content)
      );
      await indexCol.updateOne(
        { _id: doc._id },
        {
          $set: {
            embedding: meta.vector,
            embeddingDim: meta.dim,
            embeddingModel: meta.model,
            updatedAt: new Date(),
          },
        }
      );
      if (doc.sourceType === "file") result.files++;
      else result.web++;
    } catch {
      result.failed++;
    }
  }

  // Prune: now that every live source has a fresh row, delete the rows whose
  // source no longer exists (e.g. an unpublished KB article), plus any legacy
  // `qa` rows from the retired double-QA path. Done last so the index is never
  // emptied mid-rebuild. `$nin: []` correctly matches everything, so a source
  // type with zero live IDs is fully cleared.
  await indexCol.deleteMany({ sourceType: "kb", sourceId: { $nin: kbLiveIds } });
  await indexCol.deleteMany({
    sourceType: "service",
    sourceId: { $nin: serviceLiveIds },
  });
  await indexCol.deleteMany({
    sourceType: "resolved_ticket",
    sourceId: { $nin: ticketLiveIds },
  });
  await indexCol.deleteMany({ sourceType: "qa" });

  // Rebuild the Qdrant index from the freshly re-embedded Mongo vectors so the
  // search backend matches the source of truth. The per-document upserts above
  // already mirrored adds/updates to Qdrant, but the Mongo-only prune deletes
  // are not mirrored — this full resync (Mongo is authoritative) is what drops
  // the pruned points from Qdrant.
  if (isQdrantConfigured()) {
    try {
      await syncQdrantFromMongo();
    } catch (error) {
      console.error("[knowledge-index] qdrant resync after reindex failed:", error);
    }
  }

  return result;
}
