import { getChatClient, getEmbeddingClient } from "@/lib/ai/provider-client";

function cleanText(input: string): string {
  return input.trim().replace(/\s+/g, " ").slice(0, 8000);
}

export interface EmbeddingMeta {
  vector: number[];
  dim: number;
  /** Provider-qualified model id, e.g. "openai:text-embedding-3-small". */
  model: string;
}

// Short-lived LRU cache for query embeddings. Within a single chat turn the
// agent typically embeds the same/similar query for several tools; this
// collapses those into one provider round-trip. Keyed by model id so a
// provider/model switch can never serve a stale-dimension vector.
interface EmbedCacheEntry {
  meta: EmbeddingMeta;
  at: number;
}
const EMBED_CACHE = new Map<string, EmbedCacheEntry>();
const EMBED_CACHE_MAX = 256;
const EMBED_CACHE_TTL_MS = 120_000;

export async function generateEmbeddingMeta(
  text: string
): Promise<EmbeddingMeta> {
  const clean = cleanText(text);
  if (!clean) throw new Error("Cannot generate embedding for empty text");

  const { client, model, settings } = await getEmbeddingClient();
  const modelId =
    settings.embeddingProvider === "ollama"
      ? `ollama:${model}`
      : `openai:${model}`;

  const key = `${modelId}::${clean}`;
  const now = Date.now();
  const hit = EMBED_CACHE.get(key);
  if (hit && now - hit.at < EMBED_CACHE_TTL_MS) {
    EMBED_CACHE.delete(key); // refresh recency (LRU)
    EMBED_CACHE.set(key, hit);
    return hit.meta;
  }

  const response = await client.embeddings.create({
    model,
    input: clean,
    encoding_format: "float",
  });
  const vector = response.data[0].embedding;
  const meta: EmbeddingMeta = { vector, dim: vector.length, model: modelId };

  EMBED_CACHE.set(key, { meta, at: now });
  if (EMBED_CACHE.size > EMBED_CACHE_MAX) {
    const oldest = EMBED_CACHE.keys().next().value;
    if (oldest !== undefined) EMBED_CACHE.delete(oldest);
  }
  return meta;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return (await generateEmbeddingMeta(text)).vector;
}

/**
 * Embed many texts in one provider call, returning vectors 1:1 with `texts`
 * (result[i] is the embedding of texts[i]). Callers rely on this positional
 * alignment to write each vector back to its source row, so the function is
 * strict about it:
 *  - an empty/whitespace-only input is rejected (the provider would silently
 *    drop it and shift every later vector, corrupting the index);
 *  - the response is reordered by the provider's `index` field rather than
 *    trusting array order;
 *  - a count mismatch throws instead of returning a misaligned array.
 */
export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) throw new Error("No texts to embed");
  const cleaned = texts.map(cleanText);
  const emptyAt = cleaned.findIndex((t) => t.length === 0);
  if (emptyAt !== -1) {
    throw new Error(
      `Cannot embed empty text at index ${emptyAt} of ${texts.length}; ` +
        "callers must filter empties before batching to keep vectors aligned."
    );
  }

  const { client, model } = await getEmbeddingClient();
  const response = await client.embeddings.create({
    model,
    input: cleaned,
    encoding_format: "float",
  });
  if (response.data.length !== cleaned.length) {
    throw new Error(
      `Embedding count mismatch: provider returned ${response.data.length} ` +
        `vectors for ${cleaned.length} inputs.`
    );
  }
  // The API documents but does not guarantee input order; sort by `index` so
  // result[i] always corresponds to texts[i].
  return [...response.data]
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

export async function testEmbeddingConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await generateEmbedding("test connection");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message ?? "Failed to connect to the embedding provider",
    };
  }
}

export async function testChatConnection(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { client, model } = await getChatClient();
    await client.chat.completions.create({
      model,
      max_tokens: 5,
      messages: [{ role: "user", content: "ping" }],
    });
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message ?? "Failed to connect to the chat provider",
    };
  }
}

/** @deprecated use {@link testEmbeddingConnection} */
export const testApiKeyConnection = testEmbeddingConnection;
