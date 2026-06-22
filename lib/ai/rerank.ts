import { getChatClient } from "@/lib/ai/provider-client";
import type { AIKnowledgeSearchResult } from "@/types";

/**
 * LLM-as-reranker.
 *
 * Embedding similarity (and keyword overlap) is a coarse first pass — it ranks
 * by surface similarity, not by whether a passage actually *answers* the
 * question. A cross-encoder reranker fixes that; here we use the configured
 * chat model as a lightweight stand-in (no extra provider/key). It reads the
 * query against the candidate passages and returns them most-relevant-first.
 *
 * Failure is non-fatal: on any error (parse, timeout, provider) we fall back to
 * the original fused order, so reranking can only help, never break retrieval.
 */

const MAX_CANDIDATE_CHARS = 600;

const SYSTEM_PROMPT =
  "You are a search reranker for a customer-support knowledge base. Given a " +
  "user question and numbered candidate passages, order the candidates by how " +
  "directly each one answers the question (most useful first). Drop passages " +
  'that are irrelevant. Respond ONLY as JSON: {"order": [<indices>]} where ' +
  "indices refer to the candidate numbers.";

/**
 * Short-lived cache of rerank orders. The agent often re-runs the same/similar
 * search within a turn (and evals re-run identical questions), each of which
 * would otherwise be a fresh reranker LLM call. Keyed by model + query + the
 * exact candidate set, with the order stored as stable source keys so it can be
 * replayed onto the live result objects. TTL bounds staleness; LRU bounds size.
 */
const RERANK_CACHE_MAX = 128;
const RERANK_CACHE_TTL_MS = 120_000;
interface RerankCacheEntry {
  order: string[];
  at: number;
}
const RERANK_CACHE = new Map<string, RerankCacheEntry>();

function resultKey(r: AIKnowledgeSearchResult): string {
  return `${r.sourceType}::${r.sourceId}`;
}

function cacheKey(
  model: string,
  query: string,
  results: AIKnowledgeSearchResult[]
): string {
  return `${model}::${query}::${results.map(resultKey).join(",")}`;
}

/** Replay a cached order (list of source keys) onto the live result objects. */
function reorderByKeys(
  results: AIKnowledgeSearchResult[],
  order: string[],
  topK: number
): AIKnowledgeSearchResult[] {
  const byKey = new Map(results.map((r) => [resultKey(r), r]));
  const out: AIKnowledgeSearchResult[] = [];
  for (const k of order) {
    const r = byKey.get(k);
    if (r) out.push(r);
  }
  return out.slice(0, topK);
}

export async function rerankResults(
  query: string,
  results: AIKnowledgeSearchResult[],
  topK: number
): Promise<AIKnowledgeSearchResult[]> {
  if (results.length <= 1) return results.slice(0, topK);

  try {
    const { client, model } = await getChatClient();

    const key = cacheKey(model, query, results);
    const now = Date.now();
    const hit = RERANK_CACHE.get(key);
    if (hit && now - hit.at < RERANK_CACHE_TTL_MS) {
      RERANK_CACHE.delete(key); // refresh recency (LRU)
      RERANK_CACHE.set(key, hit);
      return reorderByKeys(results, hit.order, topK);
    }

    const candidates = results
      .map(
        (r, i) => `[${i}] ${r.title}\n${r.content.slice(0, MAX_CANDIDATE_CHARS)}`
      )
      .join("\n\n");

    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 256,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Question: ${query}\n\nCandidates:\n${candidates}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return results.slice(0, topK);

    const parsed = JSON.parse(raw) as { order?: unknown };
    const order = Array.isArray(parsed.order) ? parsed.order : [];

    const seen = new Set<number>();
    const reranked: AIKnowledgeSearchResult[] = [];
    for (const idx of order) {
      const n = Number(idx);
      if (Number.isInteger(n) && n >= 0 && n < results.length && !seen.has(n)) {
        seen.add(n);
        reranked.push(results[n]);
      }
    }
    // The model may legitimately drop irrelevant passages; if it returned
    // nothing usable, keep the original order rather than an empty result.
    if (reranked.length === 0) return results.slice(0, topK);

    RERANK_CACHE.set(key, { order: reranked.map(resultKey), at: now });
    if (RERANK_CACHE.size > RERANK_CACHE_MAX) {
      const oldest = RERANK_CACHE.keys().next().value;
      if (oldest !== undefined) RERANK_CACHE.delete(oldest);
    }
    return reranked.slice(0, topK);
  } catch {
    return results.slice(0, topK);
  }
}
