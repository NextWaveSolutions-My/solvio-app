import { getCollection } from "@/lib/db";
import type { AIKnowledgeEmbedding, AISettings } from "@/types";
import { embeddingModelId } from "@/lib/ai/provider-client";

/**
 * Thrown when a query embedding cannot be compared to a stored embedding
 * because they have different dimensionality (i.e. the embedding model was
 * changed without re-indexing). Previously this was silently treated as a
 * zero-similarity match, which made the bot stop answering with no signal.
 */
export class DimensionMismatchError extends Error {
  constructor(
    public readonly expected: number,
    public readonly actual: number
  ) {
    super(
      `Embedding dimension mismatch (query=${actual}, index=${expected}). ` +
        `The embedding model changed — rebuild the knowledge index.`
    );
    this.name = "DimensionMismatchError";
  }
}

export interface IndexCompatibility {
  compatible: boolean;
  /** Embedding model id the index was built with, if determinable. */
  indexedWith: string | null;
  /** Embedding model id currently configured. */
  configuredWith: string;
  /** Distinct dimensions present in the index. */
  dims: number[];
}

/**
 * Checks whether the configured embedding model matches what the knowledge
 * index was built with. Used by the admin UI to surface a "reindex required"
 * banner and by the agent to fail tools loudly rather than answer wrongly.
 */
export async function assertIndexCompatible(
  settings: AISettings
): Promise<IndexCompatibility> {
  const configuredWith = embeddingModelId(settings);
  const col =
    await getCollection<AIKnowledgeEmbedding>("ai_knowledge_embeddings");

  const sample = await col
    .find(
      {},
      { projection: { embeddingModel: 1, embeddingDim: 1 } }
    )
    .limit(500)
    .toArray();

  if (sample.length === 0) {
    return { compatible: true, indexedWith: null, configuredWith, dims: [] };
  }

  const models = new Set<string>();
  const dims = new Set<number>();
  for (const d of sample) {
    if (d.embeddingModel) models.add(d.embeddingModel);
    if (typeof d.embeddingDim === "number") dims.add(d.embeddingDim);
  }

  const indexedWith =
    models.size === 1 ? [...models][0] : models.size === 0 ? null : "mixed";

  const compatible =
    (indexedWith === null || indexedWith === configuredWith) && dims.size <= 1;

  return {
    compatible,
    indexedWith,
    configuredWith,
    dims: [...dims],
  };
}
