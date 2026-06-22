import type { QdrantClient } from "@qdrant/js-client-rest";
import type { AIKnowledgeSearchResult, AIKnowledgeSourceType } from "@/types";

/**
 * Qdrant vector store integration (self-hosted).
 *
 * Qdrant is a *derived* index: MongoDB's `ai_knowledge_embeddings` stays the
 * source of truth, and points here are copies that can be rebuilt at any time
 * (see {@link syncQdrantFromMongo}). Enabled purely by env — when `QDRANT_URL`
 * is unset every helper is a no-op and retrieval falls back to local cosine, so
 * the app runs unchanged without Qdrant.
 */

export const QDRANT_COLLECTION = "ai_knowledge";

export function isQdrantConfigured(): boolean {
  return !!process.env.QDRANT_URL;
}

let clientPromise: Promise<QdrantClient> | null = null;

async function getClient(): Promise<QdrantClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { QdrantClient } = await import("@qdrant/js-client-rest");
      return new QdrantClient({
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY || undefined,
        checkCompatibility: false,
      });
    })();
  }
  return clientPromise;
}

/**
 * Qdrant point IDs must be an unsigned int or a UUID. A Mongo ObjectId is 24
 * hex chars; pad to 32 and format as a UUID so each point maps 1:1 to its Mongo
 * document deterministically (lets us upsert/replace and delete by id).
 */
export function objectIdToPointId(hex: string): string {
  const padded = (hex + "0".repeat(32)).slice(0, 32);
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`;
}

export interface QdrantPoint {
  /** Mongo _id hex string. */
  mongoId: string;
  vector: number[];
  payload: {
    sourceType: AIKnowledgeSourceType;
    sourceId: string;
    title: string;
    content: string;
    url?: string;
    webSourceId?: string;
    fileId?: string;
    /** Owning site id; absent ⇒ Global (answerable on every site). */
    siteId?: string;
  };
}

let ensuredDim: number | null = null;

/**
 * Ensure the collection exists with the given vector size. If `recreate` is set
 * (used by a full resync) the collection is dropped first — also the way an
 * embedding-model change (new dimensionality) is handled.
 */
export async function ensureQdrantCollection(
  dim: number,
  recreate = false
): Promise<void> {
  const client = await getClient();

  if (recreate) {
    await client.deleteCollection(QDRANT_COLLECTION).catch(() => {});
    ensuredDim = null;
  } else if (ensuredDim === dim) {
    return;
  }

  const exists = await client
    .collectionExists(QDRANT_COLLECTION)
    .then((r) => r.exists)
    .catch(() => false);

  if (!exists) {
    await client.createCollection(QDRANT_COLLECTION, {
      vectors: { size: dim, distance: "Cosine" },
    });
    // Payload indexes make sourceType/siteId filtering and source-scoped
    // deletes fast.
    for (const field of ["sourceType", "webSourceId", "fileId", "siteId"]) {
      await client
        .createPayloadIndex(QDRANT_COLLECTION, {
          field_name: field,
          field_schema: "keyword",
        })
        .catch(() => {});
    }
  }
  ensuredDim = dim;
}

export async function upsertQdrantPoints(points: QdrantPoint[]): Promise<void> {
  if (points.length === 0) return;
  const client = await getClient();
  await ensureQdrantCollection(points[0].vector.length);
  await client.upsert(QDRANT_COLLECTION, {
    wait: true,
    points: points.map((p) => ({
      id: objectIdToPointId(p.mongoId),
      vector: p.vector,
      payload: p.payload,
    })),
  });
}

export async function deleteQdrantPoint(mongoId: string): Promise<void> {
  const client = await getClient();
  await client
    .delete(QDRANT_COLLECTION, {
      wait: true,
      points: [objectIdToPointId(mongoId)],
    })
    .catch(() => {});
}

/** Delete every point whose payload field equals value (e.g. all of a web source). */
export async function deleteQdrantByField(
  field: "webSourceId" | "fileId" | "sourceType",
  value: string
): Promise<void> {
  const client = await getClient();
  await client
    .delete(QDRANT_COLLECTION, {
      wait: true,
      filter: { must: [{ key: field, match: { value } }] },
    })
    .catch(() => {});
}

export async function searchQdrant(
  queryVector: number[],
  topK: number,
  sourceTypes?: AIKnowledgeSourceType[],
  siteId?: string
): Promise<AIKnowledgeSearchResult[]> {
  const client = await getClient();
  const filter: Record<string, unknown> = {};
  if (sourceTypes && sourceTypes.length > 0) {
    filter.must = [{ key: "sourceType", match: { any: sourceTypes } }];
  }
  if (siteId) {
    // Match the request's site OR global rows (no siteId payload). `should`
    // requires at least one of these to hold, AND-ed with any `must` above.
    filter.should = [
      { key: "siteId", match: { value: siteId } },
      { is_empty: { key: "siteId" } },
    ];
  }

  const results = await client.search(QDRANT_COLLECTION, {
    vector: queryVector,
    limit: topK,
    filter: Object.keys(filter).length > 0 ? (filter as never) : undefined,
    with_payload: true,
  });

  return results.map((r) => {
    const p = (r.payload ?? {}) as QdrantPoint["payload"];
    return {
      sourceType: p.sourceType,
      sourceId: p.sourceId,
      title: p.title ?? "",
      content: p.content ?? "",
      url: p.url,
      score: r.score,
    };
  });
}

export async function qdrantHealth(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await getClient();
    await client.getCollections();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}
