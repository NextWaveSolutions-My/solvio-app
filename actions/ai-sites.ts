"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth-utils";
import type { AISite, AISitePublic, ApiResponse, UserRole } from "@/types";
import { SITES_COLLECTION, generateSiteKey } from "@/lib/ai/sites";

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

function toPublic(doc: AISite): AISitePublic {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    key: doc.key,
    domains: doc.domains ?? [],
    enabled: doc.enabled,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

const domainsSchema = z
  .array(z.string().trim().min(1).max(200))
  .max(50)
  .optional();

const createSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  domains: domainsSchema,
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  domains: domainsSchema,
  enabled: z.boolean().optional(),
});

export async function listSites(): Promise<ApiResponse<AISitePublic[]>> {
  try {
    await requireAdmin();
    const col = await getCollection<AISite>(SITES_COLLECTION);
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return { success: true, data: docs.map(toPublic) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createSite(
  input: z.infer<typeof createSchema>
): Promise<ApiResponse<AISitePublic>> {
  try {
    const session = await requireAdmin();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }
    const now = new Date();
    const doc: AISite = {
      _id: new ObjectId(),
      name: parsed.data.name,
      key: generateSiteKey(),
      domains: parsed.data.domains ?? [],
      enabled: true,
      createdAt: now,
      updatedAt: now,
      createdBy: (session.user as any).id,
    };
    const col = await getCollection<AISite>(SITES_COLLECTION);
    await col.insertOne(doc);
    revalidateAI();
    return { success: true, data: toPublic(doc) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSite(
  id: string,
  input: z.infer<typeof updateSchema>
): Promise<ApiResponse<AISitePublic>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id)) return { success: false, error: "Invalid id" };
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }
    const set: Partial<AISite> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) set.name = parsed.data.name;
    if (parsed.data.domains !== undefined) set.domains = parsed.data.domains;
    if (parsed.data.enabled !== undefined) set.enabled = parsed.data.enabled;

    const col = await getCollection<AISite>(SITES_COLLECTION);
    const doc = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: set },
      { returnDocument: "after" }
    );
    if (!doc) return { success: false, error: "Site not found" };
    revalidateAI();
    return { success: true, data: toPublic(doc) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Issue a fresh key (invalidates the old embed snippet for this site). */
export async function rotateSiteKey(
  id: string
): Promise<ApiResponse<AISitePublic>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id)) return { success: false, error: "Invalid id" };
    const col = await getCollection<AISite>(SITES_COLLECTION);
    const doc = await col.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { key: generateSiteKey(), updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!doc) return { success: false, error: "Site not found" };
    revalidateAI();
    return { success: true, data: toPublic(doc) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a site. Refused while sources are still assigned to it, so deleting a
 * site can never silently strand (or globally leak) its scoped knowledge — the
 * admin must reassign or remove those sources first.
 */
export async function deleteSite(id: string): Promise<ApiResponse<null>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id)) return { success: false, error: "Invalid id" };

    const assigned = await countSiteSources(id);
    if (assigned > 0) {
      return {
        success: false,
        error: `This site still has ${assigned} assigned source(s). Reassign them to Global (or another site) or delete them first.`,
      };
    }

    const col = await getCollection<AISite>(SITES_COLLECTION);
    const res = await col.deleteOne({ _id: new ObjectId(id) });
    if (res.deletedCount === 0) return { success: false, error: "Not found" };
    revalidateAI();
    return { success: true, data: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/** Count web sources, files, and training pairs assigned to a site. */
async function countSiteSources(siteId: string): Promise<number> {
  const [webCol, fileCol, pairCol] = await Promise.all([
    getCollection("ai_web_sources"),
    getCollection("ai_files"),
    getCollection("ai_training_pairs"),
  ]);
  const [w, f, p] = await Promise.all([
    webCol.countDocuments({ siteId }),
    fileCol.countDocuments({ siteId }),
    pairCol.countDocuments({ siteId }),
  ]);
  return w + f + p;
}
