/**
 * Same-host website crawler backed by Firecrawl.
 *
 * Firecrawl handles fetching, JavaScript rendering, link discovery and main-
 * content extraction in the cloud, and returns clean markdown per page. The
 * crawl is split into two phases so callers can persist the job id between
 * them: {@link startCrawl} submits the job, {@link awaitCrawl} polls until it
 * finishes and reshapes the result into {@link CrawledPage}s. Splitting also
 * makes server-restart resumption trivial — the caller stores the id and
 * reconnects on boot.
 */

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
}

export interface CrawlProgress {
  visited: number;
  /** Best-known total reported by Firecrawl while the job runs. */
  total: number;
  lastUrl: string;
}

export interface AwaitCrawlOptions {
  /** Hard cap applied to the returned pages, even if Firecrawl overshoots. */
  maxPages: number;
  /** Maximum time (ms) to wait for the entire crawl job. */
  maxWaitMs?: number;
  /** Poll interval (ms) while the job runs. */
  pollIntervalMs?: number;
  onProgress?: (p: CrawlProgress) => void | Promise<void>;
}

/** Thrown when a previously-started job is no longer available on Firecrawl. */
export class FirecrawlJobExpiredError extends Error {
  constructor(jobId: string) {
    super(
      `Firecrawl job ${jobId} is no longer available (likely expired). ` +
        "Start a fresh crawl."
    );
    this.name = "FirecrawlJobExpiredError";
  }
}

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";
const DEFAULT_MAX_WAIT_MS = 30 * 60 * 1000;
const DEFAULT_POLL_MS = 3_000;
const POLL_RETRY_ATTEMPTS = 3;
const POLL_RETRY_BASE_MS = 1_000;

interface FirecrawlPage {
  markdown?: string;
  metadata?: {
    title?: string;
    sourceURL?: string;
    url?: string;
    statusCode?: number;
  };
}

interface FirecrawlJob {
  status: "scraping" | "completed" | "failed" | "cancelled";
  completed?: number;
  total?: number;
  data?: FirecrawlPage[];
  next?: string;
  error?: string;
}

function getApiKey(): string {
  const key = process.env.FIRECRAWL_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "FIRECRAWL_API_KEY is not set. Add it to your environment to enable " +
        "website indexing."
    );
  }
  return key;
}

async function firecrawlFetch(
  url: string,
  init: RequestInit,
  apiKey: string
): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${apiKey}`,
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Firecrawl rejected the API key. Check FIRECRAWL_API_KEY.");
  }
  return res;
}

/**
 * Submit a new crawl to Firecrawl and return the job id. Persist the id
 * before calling {@link awaitCrawl} so a process restart can reconnect to
 * the in-flight job instead of losing the work.
 */
export async function startCrawl(
  entryUrl: string,
  maxPages: number
): Promise<string> {
  const apiKey = getApiKey();
  const res = await firecrawlFetch(
    `${FIRECRAWL_BASE}/crawl`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: entryUrl,
        limit: maxPages,
        // Match the old crawler: walk the whole domain, never wander off-host.
        // Defaulting Firecrawl's behavior to "same path prefix" would silently
        // miss pages outside the entry URL's path.
        crawlEntireDomain: true,
        allowExternalLinks: false,
        scrapeOptions: {
          formats: ["markdown"],
          onlyMainContent: true,
        },
      }),
    },
    apiKey
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Firecrawl could not start the crawl (${res.status}). ${detail.slice(0, 200)}`
    );
  }
  const body = (await res.json()) as { id?: string };
  if (!body.id) throw new Error("Firecrawl did not return a crawl job id.");
  return body.id;
}

/**
 * Poll Firecrawl for job status with bounded retries. Transient failures
 * (5xx, 429, network errors) back off and retry; permanent failures (auth,
 * other 4xx) throw immediately. A 404 means the job has expired or was
 * never created on this account — surfaced as a typed error so callers can
 * treat it as terminal rather than retry.
 */
async function fetchJobPage(
  url: string,
  apiKey: string,
  jobId: string
): Promise<FirecrawlJob> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < POLL_RETRY_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const backoffMs = POLL_RETRY_BASE_MS * 2 ** (attempt - 1);
      await new Promise((r) => setTimeout(r, backoffMs));
    }
    try {
      const res = await firecrawlFetch(url, { method: "GET" }, apiKey);
      if (res.ok) return (await res.json()) as FirecrawlJob;
      if (res.status === 404) throw new FirecrawlJobExpiredError(jobId);
      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("retry-after") ?? "0");
        if (retryAfter > 0) {
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
        }
        lastError = new Error("Firecrawl rate-limited (429).");
        continue;
      }
      if (res.status >= 500) {
        lastError = new Error(`Firecrawl status check failed (${res.status}).`);
        continue;
      }
      throw new Error(`Firecrawl status check failed (${res.status}).`);
    } catch (err) {
      // `fetch` throws TypeError on network failures; retry those. Anything
      // else (auth rejection, 4xx, expired job) is permanent — surface it.
      if (!(err instanceof TypeError)) throw err;
      lastError = err;
    }
  }
  throw lastError ?? new Error("Firecrawl status check failed after retries.");
}

function toCrawledPage(page: FirecrawlPage): CrawledPage | null {
  // Firecrawl returns markdown even for 4xx/5xx pages — embedding "Not Found"
  // bodies would pollute retrieval results.
  const status = page.metadata?.statusCode;
  if (status !== undefined && status >= 400) return null;
  const text = page.markdown?.trim();
  if (!text || text.length < 40) return null;
  const url = page.metadata?.sourceURL ?? page.metadata?.url;
  if (!url) return null;
  const title = page.metadata?.title?.trim() || url;
  return { url, title, text };
}

/** Walk paginated `next` links and return every page from a finished job. */
async function collectAllPages(
  firstPage: FirecrawlJob,
  apiKey: string,
  jobId: string
): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  const seenUrls = new Set<string>();
  let current: FirecrawlJob | null = firstPage;
  while (current) {
    for (const item of current.data ?? []) {
      const page = toCrawledPage(item);
      if (page && !seenUrls.has(page.url)) {
        seenUrls.add(page.url);
        pages.push(page);
      }
    }
    if (!current.next) break;
    current = await fetchJobPage(current.next, apiKey, jobId);
  }
  return pages;
}

/**
 * Poll an existing Firecrawl job until it finishes, then collect its pages.
 * Safe to call after a process restart: just pass the previously stored
 * `jobId` and Firecrawl serves the same result. Throws
 * {@link FirecrawlJobExpiredError} if the job is gone.
 */
export async function awaitCrawl(
  jobId: string,
  options: AwaitCrawlOptions
): Promise<CrawledPage[]> {
  const apiKey = getApiKey();
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_MS;
  const statusUrl = `${FIRECRAWL_BASE}/crawl/${jobId}`;
  const deadline = Date.now() + maxWaitMs;

  let lastReportedCompleted = -1;
  let job: FirecrawlJob | null = null;

  while (Date.now() < deadline) {
    job = await fetchJobPage(statusUrl, apiKey, jobId);

    if (options.onProgress && (job.completed ?? 0) !== lastReportedCompleted) {
      lastReportedCompleted = job.completed ?? 0;
      const lastItem = job.data?.[job.data.length - 1];
      const lastUrl =
        lastItem?.metadata?.sourceURL ?? lastItem?.metadata?.url ?? "";
      await options.onProgress({
        visited: job.completed ?? 0,
        total: Math.max(job.total ?? 0, job.completed ?? 0),
        lastUrl,
      });
    }

    if (job.status === "completed") break;
    if (job.status === "failed" || job.status === "cancelled") {
      throw new Error(
        job.error ?? `Firecrawl job ${job.status}. Try re-indexing.`
      );
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  if (!job || job.status !== "completed") {
    throw new Error(
      "Crawl did not finish within the allowed time. Lower max pages or retry."
    );
  }

  // `limit` is best-effort on Firecrawl's side; enforce the cap ourselves so a
  // re-index never exceeds what the operator allowed.
  const pages = await collectAllPages(job, apiKey, jobId);
  return pages.slice(0, options.maxPages);
}
