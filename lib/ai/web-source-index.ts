import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import type { AIWebSource, AIWebSourceStatus } from "@/types";
import type { CrawledPage } from "@/lib/ai/web-crawler";
import {
  startCrawl,
  awaitCrawl,
  FirecrawlJobExpiredError,
} from "@/lib/ai/web-crawler";
import { chunkText } from "@/lib/ai/chunk";
import {
  upsertKnowledgeEmbedding,
  removeWebSourceEmbeddings,
} from "@/lib/ai/knowledge-index";
import { testEmbeddingConnection } from "@/lib/ai/embeddings";

const COLLECTION = "ai_web_sources";

/**
 * In-process registry of crawls running right now. The custom Node server
 * (`server.ts`) is a single long-lived process, so a module-level Set is enough
 * to stop the same source being crawled twice concurrently. After a restart
 * {@link resumeStrandedCrawls} repopulates it for jobs that were mid-flight.
 */
const running = new Set<string>();

export function isWebSourceCrawling(id: string): boolean {
  return running.has(id);
}

async function setStatus(
  id: ObjectId,
  status: AIWebSourceStatus,
  extra: Partial<AIWebSource> = {}
): Promise<void> {
  const col = await getCollection<AIWebSource>(COLLECTION);
  await col.updateOne(
    { _id: id },
    { $set: { status, updatedAt: new Date(), ...extra } }
  );
}

/**
 * Kick off a background crawl + index for a web source. Fire-and-forget: it
 * returns immediately and the crawl runs detached, persisting progress to the
 * source document so the admin UI can poll for status. Safe to call when a
 * crawl is already in flight (it no-ops).
 */
export function startWebSourceCrawl(id: string): void {
  if (running.has(id)) return;
  running.add(id);
  void indexWebSource(id)
    .catch((error) => {
      console.error(`[web-source] crawl failed for ${id}`, error);
    })
    .finally(() => running.delete(id));
}

async function indexWebSource(id: string): Promise<void> {
  if (!ObjectId.isValid(id)) return;
  const objectId = new ObjectId(id);
  const col = await getCollection<AIWebSource>(COLLECTION);
  const source = await col.findOne({ _id: objectId });
  if (!source) return;

  // Preflight: a misconfigured embedding provider would fail on every chunk.
  // Fail fast with one actionable message instead of a half-built index.
  const probe = await testEmbeddingConnection();
  if (!probe.success) {
    await setStatus(objectId, "failed", {
      error:
        probe.error ??
        "Embedding provider unavailable. Open AI Training → Settings.",
      progress: null,
    });
    return;
  }

  await setStatus(objectId, "crawling", {
    error: null,
    pagesIndexed: 0,
    chunksIndexed: 0,
    firecrawlJobId: null,
    progress: { visited: 0, total: 0, phase: "Crawling pages…" },
  });

  // Replace any previous crawl's chunks up front so a re-index never leaves
  // stale pages behind.
  await removeWebSourceEmbeddings(id);

  let jobId: string;
  try {
    jobId = await startCrawl(source.url, source.maxPages);
  } catch (error) {
    await setStatus(objectId, "failed", {
      error: (error as Error).message || "Crawl failed",
      progress: null,
    });
    return;
  }

  // Persist the job id so a server restart can reconnect via
  // resumeStrandedCrawls() instead of losing the in-flight work.
  await col.updateOne(
    { _id: objectId },
    { $set: { firecrawlJobId: jobId, updatedAt: new Date() } }
  );

  await finishIndex(objectId, jobId, source.maxPages);
}

/**
 * Drive an existing Firecrawl job to completion and embed its pages. Used by
 * both the fresh-start path and the server-restart resume path; the only
 * difference is who created the {@link jobId}.
 */
async function finishIndex(
  objectId: ObjectId,
  jobId: string,
  maxPages: number
): Promise<void> {
  const col = await getCollection<AIWebSource>(COLLECTION);
  const id = objectId.toString();
  // Scope every indexed chunk to the source's owning site (absent ⇒ Global).
  const sourceDoc = await col.findOne(
    { _id: objectId },
    { projection: { siteId: 1 } }
  );
  const siteId = sourceDoc?.siteId;

  let lastPersist = 0;
  let pages: CrawledPage[];
  try {
    pages = await awaitCrawl(jobId, {
      maxPages,
      onProgress: async (p) => {
        // Throttle DB writes to ~1/sec so a fast crawl does not hammer Mongo.
        const now = Date.now();
        if (now - lastPersist < 1000) return;
        lastPersist = now;
        await col.updateOne(
          { _id: objectId },
          {
            $set: {
              progress: {
                visited: p.visited,
                total: p.total,
                phase: "Crawling pages…",
              },
              updatedAt: new Date(),
            },
          }
        );
      },
    });
  } catch (error) {
    const expired = error instanceof FirecrawlJobExpiredError;
    await setStatus(objectId, "failed", {
      error: expired
        ? "The cloud crawl job expired before we could finish indexing. Re-index this source."
        : (error as Error).message || "Crawl failed",
      firecrawlJobId: null,
      progress: null,
    });
    return;
  }

  if (pages.length === 0) {
    await setStatus(objectId, "failed", {
      error:
        "No readable pages were found at this URL. Check the address is " +
        "reachable and returns HTML.",
      firecrawlJobId: null,
      progress: null,
    });
    return;
  }

  // Embed + store each page's chunks. Failures are per-chunk so one bad page
  // never aborts the whole crawl.
  let pagesIndexed = 0;
  let chunksIndexed = 0;
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx];
    const chunks = chunkText(page.text);
    if (chunks.length === 0) continue;

    let storedForPage = 0;
    for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
      const ok = await upsertKnowledgeEmbedding({
        sourceType: "web_page",
        sourceId: `${id}:${pageIdx}:${chunkIdx}`,
        title:
          chunks.length > 1
            ? `${page.title} (part ${chunkIdx + 1})`
            : page.title,
        content: chunks[chunkIdx],
        webSourceId: id,
        url: page.url,
        siteId,
      });
      if (ok) storedForPage++;
    }

    if (storedForPage > 0) {
      pagesIndexed++;
      chunksIndexed += storedForPage;
    }

    await col.updateOne(
      { _id: objectId },
      {
        $set: {
          pagesIndexed,
          chunksIndexed,
          progress: {
            visited: pageIdx + 1,
            total: pages.length,
            phase: "Embedding pages…",
          },
          updatedAt: new Date(),
        },
      }
    );
  }

  if (chunksIndexed === 0) {
    await setStatus(objectId, "failed", {
      error: "Pages were fetched but none could be embedded. Check provider.",
      firecrawlJobId: null,
      progress: null,
    });
    return;
  }

  await setStatus(objectId, "ready", {
    pagesIndexed,
    chunksIndexed,
    lastCrawledAt: new Date(),
    firecrawlJobId: null,
    progress: null,
  });
}

/**
 * Reconnect to crawls that were in-flight when the process last died. Reads
 * every source still marked "crawling" with a stored Firecrawl job id and
 * re-enters the await+embed pipeline for each. Idempotent: a job whose
 * cloud-side state is already "completed" is collected and embedded in one
 * pass; an expired job is marked failed so the user can re-index.
 */
export async function resumeStrandedCrawls(): Promise<void> {
  const col = await getCollection<AIWebSource>(COLLECTION);
  const stranded = await col
    .find({
      status: "crawling",
      firecrawlJobId: { $ne: null, $exists: true },
    })
    .toArray();
  if (stranded.length === 0) return;

  console.log(
    `[web-source] resuming ${stranded.length} stranded crawl(s) after restart`
  );

  for (const source of stranded) {
    const id = source._id.toString();
    if (!source.firecrawlJobId) continue;
    if (running.has(id)) continue;
    running.add(id);
    const jobId = source.firecrawlJobId;
    void finishIndex(source._id, jobId, source.maxPages)
      .catch((error) => {
        console.error(`[web-source] resume failed for ${id}`, error);
      })
      .finally(() => running.delete(id));
  }
}
