/**
 * @deprecated Back-compat shim. Use `@/lib/ai/provider-client` directly.
 * `getOpenAIClient()` maps to the chat client; embeddings should call
 * `getEmbeddingClient()` instead.
 */
import {
  getChatClient,
  invalidateProviderClientCache,
} from "@/lib/ai/provider-client";

export async function getOpenAIClient() {
  const { client, settings } = await getChatClient();
  return { client, settings };
}

export function invalidateOpenAIClientCache() {
  invalidateProviderClientCache();
}
