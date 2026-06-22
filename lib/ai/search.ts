import { getCollection } from "@/lib/db";
import type {
  AIMatchResult,
  AITestMatchResult,
  AITrainingPair,
} from "@/types";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { getOrCreateAISettings } from "@/lib/ai/settings-store";
import { DimensionMismatchError } from "@/lib/ai/embedding-guard";
import { cosineSimilarity } from "@/lib/ai/vector-math";

const COLLECTION = "ai_training_pairs";

async function findWithLocalCosine(
  queryEmbedding: number[],
  limit: number,
  siteId?: string
): Promise<AIMatchResult[]> {
  const col = await getCollection<AITrainingPair>(COLLECTION);
  const filter: Record<string, unknown> = {
    isActive: true,
    embeddingStatus: "generated",
  };
  // Scope to the request's site OR global pairs (no siteId). Unscoped ⇒ all.
  if (siteId) filter.$or = [{ siteId }, { siteId: { $exists: false } }];
  const pairs = await col
    .find(filter)
    .project<AITrainingPair>({
      question: 1,
      answer: 1,
      category: 1,
      embedding: 1,
    })
    .toArray();

  if (pairs.length === 0) return [];

  const usable = pairs.filter(
    (p) => Array.isArray(p.embedding) && (p.embedding as number[]).length > 0
  );
  const sameDim = usable.filter(
    (p) => (p.embedding as number[]).length === queryEmbedding.length
  );
  if (sameDim.length === 0 && usable.length > 0) {
    throw new DimensionMismatchError(
      (usable[0].embedding as number[]).length,
      queryEmbedding.length
    );
  }

  const scored = sameDim.map((p) => ({
    _id: p._id.toString(),
    question: p.question,
    answer: p.answer,
    category: p.category,
    score: cosineSimilarity(queryEmbedding, p.embedding as number[]),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export async function findSimilarPairs(
  query: string,
  limit = 5,
  opts: { siteId?: string } = {}
): Promise<AIMatchResult[]> {
  const queryEmbedding = await generateEmbedding(query);
  return findWithLocalCosine(queryEmbedding, limit, opts.siteId);
}

export async function testMatch(query: string): Promise<AITestMatchResult> {
  const settings = await getOrCreateAISettings();
  const threshold = settings.confidenceThreshold;

  const matches = await findSimilarPairs(query, 3);

  if (matches.length === 0) {
    return {
      matched: false,
      reason: "No training pairs found. Add some Q&A pairs first.",
      allMatches: [],
      threshold: Math.round(threshold * 100),
    };
  }

  const best = matches[0];
  return {
    matched: best.score >= threshold,
    bestMatch: {
      question: best.question,
      answer: best.answer,
      category: best.category,
      score: Math.round(best.score * 100),
    },
    allMatches: matches.map((m) => ({
      question: m.question,
      score: Math.round(m.score * 100),
    })),
    threshold: Math.round(threshold * 100),
  };
}
