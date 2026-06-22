import { DimensionMismatchError } from "@/lib/ai/embedding-guard";

/**
 * Cosine similarity of two equal-length vectors, in [-1, 1].
 *
 * Throws {@link DimensionMismatchError} when the lengths differ — that only
 * happens when the embedding model changed without a reindex, and a typed
 * error lets callers surface "rebuild the index" instead of silently scoring
 * everything as zero. `a` is the query vector, `b` the stored one.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new DimensionMismatchError(b.length, a.length);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
