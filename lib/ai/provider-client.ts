import OpenAI from "openai";
import type { AISettings } from "@/types";
import {
  getOrCreateAISettings,
  getDecryptedApiKey,
  getDecryptedOllamaApiKey,
} from "@/lib/ai/settings-store";
import { isLikelyValidApiKey } from "@/lib/ai/crypto";

/**
 * Provider-agnostic OpenAI-compatible client factory.
 *
 * Chat and embeddings are resolved INDEPENDENTLY so an operator can run, e.g.,
 * chat on a local Ollama model while keeping embeddings on OpenAI. Ollama is
 * reached through its OpenAI-compatible `/v1` endpoint with the same SDK and a
 * `baseURL` override.
 */

export interface ResolvedClient {
  client: OpenAI;
  model: string;
  settings: AISettings;
}

interface CacheSlot {
  client: OpenAI;
  cacheKey: string;
}

let chatCache: CacheSlot | null = null;
let embeddingCache: CacheSlot | null = null;

function fingerprint(key: string): string {
  return key ? key.slice(-8) : "none";
}

function buildOpenAIClient(apiKey: string): OpenAI {
  if (!isLikelyValidApiKey(apiKey)) {
    throw new Error(
      "OpenAI API key not configured. Open AI Training → Settings to add your key."
    );
  }
  return new OpenAI({ apiKey });
}

function buildOllamaClient(baseURL: string, apiKey: string): OpenAI {
  if (!baseURL) {
    throw new Error(
      "Ollama base URL not configured. Open AI Training → Settings."
    );
  }
  // Ollama ignores the key but the SDK requires a non-empty string.
  return new OpenAI({ baseURL, apiKey: apiKey || "ollama" });
}

export async function getChatClient(): Promise<ResolvedClient> {
  const settings = await getOrCreateAISettings();

  if (settings.chatProvider === "ollama") {
    const model = settings.ollamaChatModel?.trim();
    if (!model) {
      throw new Error("Ollama chat model not set. Open AI Training → Settings.");
    }
    const ollamaKey = getDecryptedOllamaApiKey(settings);
    const cacheKey = `ollama|${settings.ollamaBaseUrl}|${fingerprint(ollamaKey)}`;
    if (!chatCache || chatCache.cacheKey !== cacheKey) {
      chatCache = {
        client: buildOllamaClient(settings.ollamaBaseUrl, ollamaKey),
        cacheKey,
      };
    }
    return { client: chatCache.client, model, settings };
  }

  const apiKey = getDecryptedApiKey(settings);
  const cacheKey = `openai|${fingerprint(apiKey)}`;
  if (!chatCache || chatCache.cacheKey !== cacheKey) {
    chatCache = { client: buildOpenAIClient(apiKey), cacheKey };
  }
  return { client: chatCache.client, model: settings.chatModel, settings };
}

export async function getEmbeddingClient(): Promise<ResolvedClient> {
  const settings = await getOrCreateAISettings();

  if (settings.embeddingProvider === "ollama") {
    const model = settings.ollamaEmbeddingModel?.trim();
    if (!model) {
      throw new Error(
        "Ollama embedding model not set. Open AI Training → Settings."
      );
    }
    const ollamaKey = getDecryptedOllamaApiKey(settings);
    const cacheKey = `ollama|${settings.ollamaBaseUrl}|${fingerprint(ollamaKey)}`;
    if (!embeddingCache || embeddingCache.cacheKey !== cacheKey) {
      embeddingCache = {
        client: buildOllamaClient(settings.ollamaBaseUrl, ollamaKey),
        cacheKey,
      };
    }
    return { client: embeddingCache.client, model, settings };
  }

  const apiKey = getDecryptedApiKey(settings);
  const cacheKey = `openai|${fingerprint(apiKey)}`;
  if (!embeddingCache || embeddingCache.cacheKey !== cacheKey) {
    embeddingCache = { client: buildOpenAIClient(apiKey), cacheKey };
  }
  return {
    client: embeddingCache.client,
    model: settings.embeddingModel,
    settings,
  };
}

/** Identifies the embedding space currently configured (provider+model). */
export function embeddingModelId(settings: AISettings): string {
  return settings.embeddingProvider === "ollama"
    ? `ollama:${settings.ollamaEmbeddingModel ?? ""}`
    : `openai:${settings.embeddingModel}`;
}

export function invalidateProviderClientCache(): void {
  chatCache = null;
  embeddingCache = null;
}
