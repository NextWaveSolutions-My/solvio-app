"use server";

import { ObjectId, type UpdateFilter } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth-utils";
import type {
  AIWebSource,
  AIWebSourcePublic,
  ApiResponse,
  UserRole,
} from "@/types";
import {
  startWebSourceCrawl,
  isWebSourceCrawling,
} from "@/lib/ai/web-source-index";
import {
  removeWebSourceEmbeddings,
  updateWebSourceEmbeddingsSiteScope,
} from "@/lib/ai/knowledge-index";
import { normalizeSiteId } from "@/lib/ai/sites";

const COLLECTION = "ai_web_sources";

/** Default page cap per crawl, and the hard ceiling an operator may request. */
const DEFAULT_MAX_PAGES = 100;
const MAX_PAGES_CEILING = 500;

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const role = ((session.user as any)?.role ?? "customer") as UserRole;
  if (role !== "admin") throw new Error("Forbidden: Admin access required");
  return session;
}

function revalidateAI() {
  revalidatePath("/admin/ai-support-agent");
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  url: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .refine((u) => /^https?:\/\//i.test(u), "URL must start with http(s)://"),
  maxPages: z.number().int().min(1).max(MAX_PAGES_CEILING).optional(),
  /** Owning site id (absent ⇒ Global). */
  siteId: z.string().max(100).optional(),
});

const scopeSchema = z.object({
  siteId: z.string().max(100).optional(),
});

function toPublic(doc: AIWebSource): AIWebSourcePublic {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    url: doc.url,
    host: doc.host,
    siteId: doc.siteId,
    // A process restart can strand a doc in "crawling"; reflect that it is no
    // longer actually running so the UI does not poll forever.
    status:
      doc.status === "crawling" && !isWebSourceCrawling(doc._id.toString())
        ? "queued"
        : doc.status,
    maxPages: doc.maxPages,
    pagesIndexed: doc.pagesIndexed,
    chunksIndexed: doc.chunksIndexed,
    progress: doc.progress ?? null,
    error: doc.error ?? null,
    lastCrawledAt: doc.lastCrawledAt ? doc.lastCrawledAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listWebSources(): Promise<
  ApiResponse<AIWebSourcePublic[]>
> {
  try {
    await requireAdmin();
    const col = await getCollection<AIWebSource>(COLLECTION);
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return { success: true, data: docs.map(toPublic) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createWebSource(
  input: z.infer<typeof createSchema>
): Promise<ApiResponse<AIWebSourcePublic>> {
  try {
    const session = await requireAdmin();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    const { name, url, maxPages } = parsed.data;
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      return { success: false, error: "Enter a valid URL" };
    }
    const siteId = await normalizeSiteId(parsed.data.siteId);

    const col = await getCollection<AIWebSource>(COLLECTION);
    const now = new Date();
    const doc: AIWebSource = {
      _id: new ObjectId(),
      name: name.trim(),
      url: url.trim(),
      host,
      ...(siteId ? { siteId } : {}),
      status: "queued",
      maxPages: maxPages ?? DEFAULT_MAX_PAGES,
      pagesIndexed: 0,
      chunksIndexed: 0,
      progress: null,
      error: null,
      lastCrawledAt: null,
      createdAt: now,
      updatedAt: now,
      createdBy: (session.user as any).id,
    };
    await col.insertOne(doc);

    // Detached background crawl; the UI polls `listWebSources` for progress.
    startWebSourceCrawl(doc._id.toString());

    revalidateAI();
    return { success: true, data: toPublic(doc) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reindexWebSource(
  id: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id)) {
      return { success: false, error: "Invalid source ID" };
    }
    if (isWebSourceCrawling(id)) {
      return { success: false, error: "This source is already being indexed" };
    }

    const col = await getCollection<AIWebSource>(COLLECTION);
    const source = await col.findOne({ _id: new ObjectId(id) });
    if (!source) return { success: false, error: "Web source not found" };

    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: "queued", error: null, updatedAt: new Date() } }
    );
    startWebSourceCrawl(id);

    revalidateAI();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateWebSourceSite(
  id: string,
  input: z.infer<typeof scopeSchema>
): Promise<ApiResponse<AIWebSourcePublic>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id)) {
      return { success: false, error: "Invalid source ID" };
    }
    const parsed = scopeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }
    if (isWebSourceCrawling(id)) {
      return {
        success: false,
        error: "Wait for indexing to finish before changing scope",
      };
    }

    const col = await getCollection<AIWebSource>(COLLECTION);
    const source = await col.findOne({ _id: new ObjectId(id) });
    if (!source) return { success: false, error: "Web source not found" };
    if (source.status === "crawling" || source.status === "queued") {
      return {
        success: false,
        error: "Wait for indexing to finish before changing scope",
      };
    }

    const siteId = await normalizeSiteId(parsed.data.siteId);
    const update: UpdateFilter<AIWebSource> = {
      $set: { updatedAt: new Date(), ...(siteId ? { siteId } : {}) },
    };
    if (!siteId) update.$unset = { siteId: "" };

    const doc = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
      { returnDocument: "after" }
    );
    if (!doc) return { success: false, error: "Web source not found" };

    await updateWebSourceEmbeddingsSiteScope(id, siteId);
    revalidateAI();
    return { success: true, data: toPublic(doc) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteWebSource(id: string): Promise<ApiResponse<void>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id)) {
      return { success: false, error: "Invalid source ID" };
    }
    if (isWebSourceCrawling(id)) {
      return {
        success: false,
        error: "Wait for indexing to finish before deleting this source",
      };
    }

    const col = await getCollection<AIWebSource>(COLLECTION);
    await col.deleteOne({ _id: new ObjectId(id) });
    await removeWebSourceEmbeddings(id);

    revalidateAI();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
