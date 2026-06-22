"use server";

import { ObjectId, type UpdateFilter } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth-utils";
import type {
  AISettings,
  AISettingsPublic,
  AITestMatchResult,
  AITrainingPair,
  AITrainingPairPublic,
  ApiResponse,
  RetrievalIndexHealth,
  UserRole,
} from "@/types";
import { encryptApiKey, isLikelyValidApiKey } from "@/lib/ai/crypto";
import { normalizeSiteId } from "@/lib/ai/sites";
import {
  buildDefaultAISettings,
  getChatbotConfig,
  getOrCreateAISettings,
  toPublicAISettings,
} from "@/lib/ai/settings-store";
import { uploadFile, isFileUploadsEnabled } from "@/lib/storage";
import { invalidateProviderClientCache } from "@/lib/ai/provider-client";
import {
  generateEmbeddingMeta,
  generateEmbeddingsBatch,
  testEmbeddingConnection,
  testChatConnection,
} from "@/lib/ai/embeddings";
import { embeddingModelId } from "@/lib/ai/provider-client";
import { testMatch } from "@/lib/ai/search";
import {
  removeAllResolvedTicketEmbeddings,
  reindexAllKnowledge,
  syncQdrantFromMongo,
  getRetrievalIndexHealth,
} from "@/lib/ai/knowledge-index";
import { isQdrantConfigured, qdrantHealth } from "@/lib/ai/qdrant";

const PAIRS_COLLECTION = "ai_training_pairs";
const SETTINGS_COLLECTION = "ai_settings";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const role = ((session.user as any)?.role ?? "customer") as UserRole;
  if (role !== "admin") throw new Error("Forbidden: Admin access required");
  return session;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const pairSchema = z.object({
  question: z.string().min(1, "Question is required").max(1000),
  answer: z.string().min(1, "Answer is required").max(5000),
  category: z.string().max(100).optional().default("General"),
  isActive: z.boolean().optional().default(true),
  /** Owning site id (absent/"" ⇒ Global). */
  siteId: z.string().max(100).optional(),
});

const settingsSchema = z.object({
  chatModel: z.string().min(1).max(100).optional(),
  embeddingModel: z.string().min(1).max(100).optional(),
  chatProvider: z.enum(["openai", "ollama"]).optional(),
  embeddingProvider: z.enum(["openai", "ollama"]).optional(),
  ollamaBaseUrl: z.string().url().max(300).optional(),
  ollamaChatModel: z.string().max(100).optional(),
  ollamaEmbeddingModel: z.string().max(100).optional(),
  ollamaApiKey: z.string().max(200).optional(),
  agent: z
    .object({
      enabled: z.boolean(),
      maxIterations: z.number().int().min(1).max(8),
      indexResolvedTickets: z.boolean(),
    })
    .optional(),
  confidenceThreshold: z.number().min(0.5).max(0.95).optional(),
  maxTokens: z.number().int().min(50).max(4000).optional(),
  temperature: z.number().min(0).max(1).optional(),
  features: z
    .object({
      chatbot: z.boolean(),
      agentSuggest: z.boolean(),
      ticketClassify: z.boolean(),
    })
    .optional(),
  businessName: z.string().max(200).optional(),
  businessDescription: z.string().max(2000).optional(),
  systemPrompt: z.string().max(4000).optional(),
  vectorSearchMethod: z.enum(["local", "qdrant"]).optional(),
  searchMode: z.enum(["vector", "hybrid"]).optional(),
  rerankEnabled: z.boolean().optional(),
  generativeMode: z.enum(["off", "strict", "hybrid"]).optional(),
  chatbot: z
    .object({
      welcomeMessage: z.string().max(500),
      fallbackMessage: z.string().max(500),
      placeholder: z.string().max(100),
      position: z.enum(["bottom-right", "bottom-left"]),
      primaryColor: z.string().max(20),
      accentColor: z.string().max(20),
      headerTitle: z.string().max(60),
      footerText: z.string().max(60),
      headerAvatarUrl: z.string().max(500),
      widgetWidth: z.number().int().min(320).max(640),
      widgetHeight: z.number().int().min(420).max(900),
      rateLimitPerMinute: z.number().int().min(1).max(200),
      ticketRateLimitPerHour: z.number().int().min(1).max(50),
      showPoweredBy: z.boolean(),
    })
    .partial()
    .optional(),
  apiKey: z.string().optional(),
});

const importSchema = z.object({
  pairs: z
    .array(
      z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
        category: z.string().optional(),
      })
    )
    .min(1)
    .max(500),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPublicAITrainingPair(
  pair: AITrainingPair | Omit<AITrainingPair, "embedding">
): AITrainingPairPublic {
  return {
    _id: pair._id.toString(),
    question: pair.question,
    answer: pair.answer,
    category: pair.category,
    siteId: pair.siteId,
    isActive: pair.isActive,
    matchCount: pair.matchCount,
    lastMatchedAt: pair.lastMatchedAt ? pair.lastMatchedAt.toISOString() : null,
    embeddingStatus: pair.embeddingStatus,
    embeddingError: pair.embeddingError,
    createdAt: pair.createdAt.toISOString(),
    updatedAt: pair.updatedAt.toISOString(),
    createdBy: pair.createdBy,
    updatedBy: pair.updatedBy,
  };
}

function revalidateAI() {
  revalidatePath("/admin/ai-support-agent");
}

// ─── Settings Actions ────────────────────────────────────────────────────────

export async function getAISettings(): Promise<ApiResponse<AISettingsPublic>> {
  try {
    await requireAdmin();
    const settings = await getOrCreateAISettings();
    return { success: true, data: toPublicAISettings(settings) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAISettings(
  input: z.infer<typeof settingsSchema>
): Promise<ApiResponse<AISettingsPublic>> {
  try {
    const session = await requireAdmin();
    const parsed = settingsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    const col = await getCollection<AISettings>(SETTINGS_COLLECTION);
    let settings = await col.findOne({});

    if (!settings) {
      settings = {
        _id: new ObjectId(),
        ...buildDefaultAISettings(),
      };
      await col.insertOne(settings);
    }

    const updates: Partial<AISettings> = {
      updatedAt: new Date(),
      updatedBy: (session.user as any).id,
    };

    const {
      apiKey,
      features,
      chatModel,
      embeddingModel,
      confidenceThreshold,
      maxTokens,
      temperature,
      businessName,
      businessDescription,
      systemPrompt,
      vectorSearchMethod,
      searchMode,
      rerankEnabled,
      chatbot,
      generativeMode,
      chatProvider,
      embeddingProvider,
      ollamaBaseUrl,
      ollamaChatModel,
      ollamaEmbeddingModel,
      ollamaApiKey,
      agent,
    } = parsed.data;

    if (chatModel !== undefined) updates.chatModel = chatModel;
    if (embeddingModel !== undefined) updates.embeddingModel = embeddingModel;
    if (chatProvider !== undefined) updates.chatProvider = chatProvider;
    if (embeddingProvider !== undefined)
      updates.embeddingProvider = embeddingProvider;
    if (ollamaBaseUrl !== undefined) updates.ollamaBaseUrl = ollamaBaseUrl;
    if (ollamaChatModel !== undefined)
      updates.ollamaChatModel = ollamaChatModel;
    if (ollamaEmbeddingModel !== undefined)
      updates.ollamaEmbeddingModel = ollamaEmbeddingModel;
    if (agent !== undefined) updates.agent = agent;

    // Turning resolved-ticket indexing off must also purge already-indexed
    // ticket content, otherwise old customer data stays retrievable until a
    // reindex. Detect the true→false transition and purge after the save.
    const resolvedTicketsDisabled =
      agent !== undefined &&
      settings.agent?.indexResolvedTickets === true &&
      agent.indexResolvedTickets === false;

    // The embedding "fingerprint" determines vector dimensionality. If any
    // part of it changed, the stored index is now stale — flag it instead of
    // silently breaking cosine matching.
    const prevEmbedFp = [
      settings.embeddingProvider ?? "openai",
      settings.embeddingProvider === "ollama"
        ? settings.ollamaEmbeddingModel
        : settings.embeddingModel,
      settings.ollamaBaseUrl,
    ].join("|");
    const nextEmbedFp = [
      embeddingProvider ?? settings.embeddingProvider ?? "openai",
      (embeddingProvider ?? settings.embeddingProvider) === "ollama"
        ? (ollamaEmbeddingModel ?? settings.ollamaEmbeddingModel)
        : (embeddingModel ?? settings.embeddingModel),
      ollamaBaseUrl ?? settings.ollamaBaseUrl,
    ].join("|");
    if (prevEmbedFp !== nextEmbedFp) {
      updates.reindexRequired = true;
      invalidateProviderClientCache();
    }
    if (confidenceThreshold !== undefined)
      updates.confidenceThreshold = confidenceThreshold;
    if (maxTokens !== undefined) updates.maxTokens = maxTokens;
    if (temperature !== undefined) updates.temperature = temperature;
    if (features !== undefined) updates.features = features;
    if (businessName !== undefined) updates.businessName = businessName;
    if (businessDescription !== undefined)
      updates.businessDescription = businessDescription;
    if (systemPrompt !== undefined) updates.systemPrompt = systemPrompt;
    if (vectorSearchMethod !== undefined)
      updates.vectorSearchMethod = vectorSearchMethod;
    if (searchMode !== undefined) updates.searchMode = searchMode;
    if (rerankEnabled !== undefined) updates.rerankEnabled = rerankEnabled;
    if (chatbot !== undefined) {
      // Merge so the Settings tab and the Widget tab can each save their own
      // subset of fields without clobbering the other's.
      updates.chatbot = { ...getChatbotConfig(settings), ...chatbot };
    }
    if (generativeMode !== undefined) updates.generativeMode = generativeMode;

    if (apiKey && apiKey.trim() && !apiKey.startsWith("sk-...")) {
      if (!isLikelyValidApiKey(apiKey.trim())) {
        return {
          success: false,
          error: "API key must start with 'sk-' and be at least 20 characters.",
        };
      }
      updates.apiKeyEncrypted = encryptApiKey(apiKey.trim());
      invalidateProviderClientCache();
    }

    if (
      ollamaApiKey !== undefined &&
      ollamaApiKey.trim() &&
      !ollamaApiKey.startsWith("***")
    ) {
      updates.ollamaApiKeyEncrypted = encryptApiKey(ollamaApiKey.trim());
      invalidateProviderClientCache();
    }

    await col.updateOne({ _id: settings._id }, { $set: updates });
    const updated = await col.findOne({ _id: settings._id });

    if (resolvedTicketsDisabled) {
      await removeAllResolvedTicketEmbeddings();
    }

    revalidateAI();
    return {
      success: true,
      data: toPublicAISettings(updated as AISettings),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Upload an image (e.g. the widget header avatar) and return its hosted URL. */
export async function uploadAIWidgetImage(
  formData: FormData
): Promise<ApiResponse<{ url: string }>> {
  try {
    const session = await requireAdmin();
    if (!isFileUploadsEnabled()) {
      return { success: false, error: "File uploads are not enabled" };
    }
    const file = formData.get("file") as File | null;
    if (!file) {
      return { success: false, error: "No file provided" };
    }
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Only image files are allowed" };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: "Image must be smaller than 5MB" };
    }
    const uploaded = await uploadFile({
      file,
      folder: "ai-widget",
      userId: (session.user as any).id,
    });
    return { success: true, data: { url: uploaded.url } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testAISettingsConnection(): Promise<
  ApiResponse<{ ok: true }>
> {
  try {
    await requireAdmin();
    const result = await testEmbeddingConnection();
    if (!result.success) {
      return { success: false, error: result.error ?? "Connection failed" };
    }
    return { success: true, data: { ok: true } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testAIChatConnection(): Promise<
  ApiResponse<{ ok: true }>
> {
  try {
    await requireAdmin();
    const result = await testChatConnection();
    if (!result.success) {
      return { success: false, error: result.error ?? "Connection failed" };
    }
    return { success: true, data: { ok: true } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Training Pair Actions ───────────────────────────────────────────────────

export interface ListPairsOptions {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListPairsResult {
  pairs: AITrainingPairPublic[];
  total: number;
  /** Count of active pairs matching the filter (not just the current page). */
  activeCount: number;
  /** Count of pairs with a generated embedding matching the filter. */
  readyCount: number;
  page: number;
  pages: number;
  limit: number;
  categories: string[];
}

export async function listAITrainingPairs(
  options: ListPairsOptions = {}
): Promise<ApiResponse<ListPairsResult>> {
  try {
    await requireAdmin();
    const { category, search } = options;
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));

    const filter: Record<string, unknown> = {};
    if (category && category !== "all") filter.category = category;
    if (search && search.trim()) {
      const rx = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [{ question: rx }, { answer: rx }];
    }

    const col = await getCollection<AITrainingPair>(PAIRS_COLLECTION);
    const [docs, total, activeCount, readyCount, categories] =
      await Promise.all([
        col
          .find(filter)
          .project<AITrainingPair>({ embedding: 0 })
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        col.countDocuments(filter),
        col.countDocuments({ ...filter, isActive: true }),
        col.countDocuments({ ...filter, embeddingStatus: "generated" }),
        col.distinct("category"),
      ]);

    return {
      success: true,
      data: {
        pairs: docs.map((d) => toPublicAITrainingPair(d)),
        total,
        activeCount,
        readyCount,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
        categories: (categories as string[]).filter(Boolean),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAITrainingPair(
  id: string
): Promise<ApiResponse<AITrainingPairPublic>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id))
      return { success: false, error: "Invalid pair ID" };

    const col = await getCollection<AITrainingPair>(PAIRS_COLLECTION);
    const pair = await col.findOne(
      { _id: new ObjectId(id) },
      { projection: { embedding: 0 } }
    );
    if (!pair) return { success: false, error: "Training pair not found" };
    return { success: true, data: toPublicAITrainingPair(pair) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAITrainingPair(
  input: z.infer<typeof pairSchema>
): Promise<ApiResponse<{ id: string; embeddingStatus: string }>> {
  try {
    const session = await requireAdmin();
    const parsed = pairSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0]?.message };

    const { question, answer, category, isActive } = parsed.data;
    const siteId = await normalizeSiteId(parsed.data.siteId);
    const col = await getCollection<AITrainingPair>(PAIRS_COLLECTION);

    const duplicate = await col.findOne({
      question: {
        $regex: `^${question.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });
    if (duplicate) {
      return {
        success: false,
        error: "A training pair with this question already exists",
      };
    }

    const now = new Date();
    const userId = (session.user as any).id as string;

    let embedding: number[] | undefined;
    let embeddingDim: number | undefined;
    let embeddingModel: string | undefined;
    let embeddingStatus: AITrainingPair["embeddingStatus"] = "pending";
    let embeddingError: string | null = null;

    try {
      const meta = await generateEmbeddingMeta(question.trim());
      embedding = meta.vector;
      embeddingDim = meta.dim;
      embeddingModel = meta.model;
      embeddingStatus = "generated";
    } catch (error: any) {
      embeddingStatus = "failed";
      embeddingError = error?.message ?? "Unknown embedding error";
    }

    const doc: AITrainingPair = {
      _id: new ObjectId(),
      question: question.trim(),
      answer: answer.trim(),
      category: (category || "General").trim() || "General",
      ...(siteId ? { siteId } : {}),
      embedding,
      embeddingDim,
      embeddingModel,
      isActive,
      matchCount: 0,
      lastMatchedAt: null,
      embeddingStatus,
      embeddingError,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    await col.insertOne(doc);

    revalidateAI();

    return {
      success: true,
      data: { id: doc._id.toString(), embeddingStatus },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAITrainingPair(
  id: string,
  input: z.infer<typeof pairSchema>
): Promise<ApiResponse<void>> {
  try {
    const session = await requireAdmin();
    if (!ObjectId.isValid(id))
      return { success: false, error: "Invalid pair ID" };

    const parsed = pairSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0]?.message };

    const col = await getCollection<AITrainingPair>(PAIRS_COLLECTION);
    const existing = await col.findOne({ _id: new ObjectId(id) });
    if (!existing) return { success: false, error: "Training pair not found" };

    const { question, answer, category, isActive } = parsed.data;
    const trimmedQuestion = question.trim();
    const userId = (session.user as any).id as string;
    const siteId = await normalizeSiteId(parsed.data.siteId);

    const updates: Partial<AITrainingPair> = {
      question: trimmedQuestion,
      answer: answer.trim(),
      category: (category || "General").trim() || "General",
      isActive,
      updatedAt: new Date(),
      updatedBy: userId,
    };

    if (trimmedQuestion !== existing.question) {
      try {
        const meta = await generateEmbeddingMeta(trimmedQuestion);
        updates.embedding = meta.vector;
        updates.embeddingDim = meta.dim;
        updates.embeddingModel = meta.model;
        updates.embeddingStatus = "generated";
        updates.embeddingError = null;
      } catch (error: any) {
        updates.embeddingStatus = "failed";
        updates.embeddingError = error?.message ?? "Unknown embedding error";
      }
    }

    // Reassigning to Global clears the field so global queries include it.
    const write: UpdateFilter<AITrainingPair> = {
      $set: { ...updates, ...(siteId ? { siteId } : {}) },
    };
    if (!siteId) write.$unset = { siteId: "" };
    await col.updateOne({ _id: new ObjectId(id) }, write);

    revalidateAI();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAITrainingPair(
  id: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id))
      return { success: false, error: "Invalid pair ID" };

    const col = await getCollection<AITrainingPair>(PAIRS_COLLECTION);
    await col.deleteOne({ _id: new ObjectId(id) });
    revalidateAI();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleAITrainingPairActive(
  id: string,
  isActive: boolean
): Promise<ApiResponse<void>> {
  try {
    const session = await requireAdmin();
    if (!ObjectId.isValid(id))
      return { success: false, error: "Invalid pair ID" };

    const col = await getCollection<AITrainingPair>(PAIRS_COLLECTION);
    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isActive,
          updatedAt: new Date(),
          updatedBy: (session.user as any).id,
        },
      }
    );

    revalidateAI();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function importAITrainingPairs(
  input: z.infer<typeof importSchema>
): Promise<ApiResponse<{ imported: number; failed: number; skipped: number }>> {
  try {
    const session = await requireAdmin();
    const parsed = importSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0]?.message };

    const col = await getCollection<AITrainingPair>(PAIRS_COLLECTION);
    const userId = (session.user as any).id as string;
    const now = new Date();

    const existingQuestions = new Set(
      (
        await col
          .find({}, { projection: { question: 1 } })
          .toArray()
      ).map((p) => p.question.toLowerCase())
    );

    const unique = parsed.data.pairs.filter(
      (p) => !existingQuestions.has(p.question.trim().toLowerCase())
    );
    const skipped = parsed.data.pairs.length - unique.length;

    if (unique.length === 0) {
      return {
        success: true,
        data: { imported: 0, failed: 0, skipped },
      };
    }

    const BATCH = 100;
    let imported = 0;
    let failed = 0;
    const modelId = embeddingModelId(await getOrCreateAISettings());

    for (let i = 0; i < unique.length; i += BATCH) {
      const batch = unique.slice(i, i + BATCH);
      let embeddings: number[][] | null = null;
      try {
        embeddings = await generateEmbeddingsBatch(batch.map((p) => p.question));
      } catch {
        embeddings = null;
      }

      const docs: AITrainingPair[] = batch.map((p, idx) => {
        const emb = embeddings?.[idx];
        return {
          _id: new ObjectId(),
          question: p.question.trim(),
          answer: p.answer.trim(),
          category: (p.category || "General").trim() || "General",
          embedding: emb,
          embeddingDim: emb ? emb.length : undefined,
          embeddingModel: emb ? modelId : undefined,
          isActive: true,
          matchCount: 0,
          lastMatchedAt: null,
          embeddingStatus: emb ? "generated" : "failed",
          embeddingError: emb ? null : "Batch embedding failed",
          createdAt: now,
          updatedAt: now,
          createdBy: userId,
          updatedBy: userId,
        };
      });

      await col.insertMany(docs);

      if (embeddings) {
        imported += docs.length;
      } else {
        failed += docs.length;
      }
    }

    revalidateAI();
    return { success: true, data: { imported, failed, skipped } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function regenerateAIEmbeddings(): Promise<
  ApiResponse<{ regenerated: number; failed: number }>
> {
  try {
    await requireAdmin();
    const col = await getCollection<AITrainingPair>(PAIRS_COLLECTION);
    const pending = await col
      .find({ embeddingStatus: { $in: ["pending", "failed"] } })
      .project<{ _id: ObjectId; question: string }>({ question: 1 })
      .toArray();

    if (pending.length === 0) {
      return { success: true, data: { regenerated: 0, failed: 0 } };
    }

    const BATCH = 100;
    let regenerated = 0;
    let failed = 0;
    const modelId = embeddingModelId(await getOrCreateAISettings());

    for (let i = 0; i < pending.length; i += BATCH) {
      const batch = pending.slice(i, i + BATCH);
      try {
        const embeddings = await generateEmbeddingsBatch(
          batch.map((b) => b.question)
        );
        await Promise.all(
          batch.map((b, idx) =>
            col.updateOne(
              { _id: b._id },
              {
                $set: {
                  embedding: embeddings[idx],
                  embeddingDim: embeddings[idx].length,
                  embeddingModel: modelId,
                  embeddingStatus: "generated",
                  embeddingError: null,
                  updatedAt: new Date(),
                },
              }
            )
          )
        );
        regenerated += batch.length;
      } catch (error: any) {
        await Promise.all(
          batch.map((b) =>
            col.updateOne(
              { _id: b._id },
              {
                $set: {
                  embeddingStatus: "failed",
                  embeddingError: error?.message ?? "Batch failed",
                  updatedAt: new Date(),
                },
              }
            )
          )
        );
        failed += batch.length;
      }
    }

    revalidateAI();
    return { success: true, data: { regenerated, failed } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reindexKnowledgeBase(): Promise<
  ApiResponse<{
    kb: number;
    services: number;
    resolvedTickets: number;
    web: number;
    files: number;
    failed: number;
    pairsReembedded: number;
  }>
> {
  try {
    await requireAdmin();
    const result = await reindexAllKnowledge();

    // Re-embed every active training pair so findSimilarPairs() matches the
    // new embedding space (dimensions change when the model/provider changes).
    const col = await getCollection<AITrainingPair>(PAIRS_COLLECTION);
    const pairs = await col
      .find({ isActive: true })
      .project<{ _id: ObjectId; question: string }>({ question: 1 })
      .toArray();
    const modelId = embeddingModelId(await getOrCreateAISettings());
    const BATCH = 100;
    let pairsReembedded = 0;
    for (let i = 0; i < pairs.length; i += BATCH) {
      const batch = pairs.slice(i, i + BATCH);
      try {
        const embeddings = await generateEmbeddingsBatch(
          batch.map((b) => b.question)
        );
        await Promise.all(
          batch.map((b, idx) =>
            col.updateOne(
              { _id: b._id },
              {
                $set: {
                  embedding: embeddings[idx],
                  embeddingDim: embeddings[idx].length,
                  embeddingModel: modelId,
                  embeddingStatus: "generated",
                  embeddingError: null,
                  updatedAt: new Date(),
                },
              }
            )
          )
        );
        pairsReembedded += batch.length;
      } catch {
        // leave these pairs as-is; surfaced via embeddingStatus elsewhere
      }
    }

    // Index is now consistent with the configured embedding model.
    const settingsCol = await getCollection<AISettings>(SETTINGS_COLLECTION);
    await settingsCol.updateOne({}, { $set: { reindexRequired: false } });

    revalidateAI();
    return { success: true, data: { ...result, pairsReembedded } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Backfill / rebuild the Qdrant vector index from the embeddings already in
 * Mongo. Cheap (no re-embedding) — use it for first-time setup after enabling
 * Qdrant, or to repair drift. Reindex also resyncs automatically.
 */
export async function syncQdrant(): Promise<
  ApiResponse<{ synced: number }>
> {
  try {
    await requireAdmin();
    if (!isQdrantConfigured()) {
      return {
        success: false,
        error: "QDRANT_URL is not set. Add it to your environment first.",
      };
    }
    const health = await qdrantHealth();
    if (!health.ok) {
      return {
        success: false,
        error: `Cannot reach Qdrant: ${health.error ?? "unknown error"}`,
      };
    }
    const result = await syncQdrantFromMongo();
    revalidateAI();
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Index size + search-backend snapshot, so the Settings UI can recommend moving
 * to Qdrant once local cosine is being pushed past the point it scales.
 */
export async function getRetrievalHealth(): Promise<
  ApiResponse<RetrievalIndexHealth>
> {
  try {
    await requireAdmin();
    return { success: true, data: await getRetrievalIndexHealth() };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function testAIMatch(
  question: string
): Promise<ApiResponse<AITestMatchResult>> {
  try {
    await requireAdmin();
    if (!question?.trim())
      return { success: false, error: "Please enter a question to test" };

    const result = await testMatch(question.trim());
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
