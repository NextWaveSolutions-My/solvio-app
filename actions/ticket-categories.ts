"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession, requirePermissionOrThrow } from "@/lib/auth-utils";
import {
  RESERVED_TICKET_CATEGORY_SLUGS,
  ensureDefaultTicketCategories,
  slugifyTicketCategory,
} from "@/lib/ticket-categories";
import type { ApiResponse, TicketCategoryDefinition, UserRole } from "@/types";

async function requireSignedIn() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const role = ((session.user as any)?.role ?? "customer") as UserRole;
  const userId = (session.user as any)?.id ?? "unknown";
  return { session, role, userId };
}

async function requireAdmin() {
  const session = await requirePermissionOrThrow("tickets.manage", {
    message: "Forbidden: Tickets manage access required",
  });
  return (session.user as { id?: string })?.id ?? "unknown";
}

export async function getTicketCategories(): Promise<
  ApiResponse<
    Array<{
      id: string;
      name: string;
      slug: string;
      isActive: boolean;
      isSystem: boolean;
      sortOrder: number;
    }>
  >
> {
  try {
    await requireSignedIn();
    await ensureDefaultTicketCategories();

    const collection = await getCollection<TicketCategoryDefinition>("ticket_categories");
    const categories = await collection
      .find({})
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    return {
      success: true,
      data: categories.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        slug: c.slug,
        isActive: c.isActive,
        isSystem: c.isSystem,
        sortOrder: c.sortOrder ?? 0,
      })),
    };
  } catch (error: any) {
    console.error("Get ticket categories error:", error);
    return { success: false, error: error.message || "Failed to load categories" };
  }
}

export async function getActiveTicketCategories(): Promise<
  ApiResponse<Array<{ slug: string; name: string }>>
> {
  try {
    await requireSignedIn();
    await ensureDefaultTicketCategories();

    const collection = await getCollection<TicketCategoryDefinition>("ticket_categories");
    const categories = await collection
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    return {
      success: true,
      data: categories.map((c) => ({ slug: c.slug, name: c.name })),
    };
  } catch (error: any) {
    console.error("Get active ticket categories error:", error);
    return { success: false, error: error.message || "Failed to load categories" };
  }
}

const createTicketCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  slug: z.string().optional(),
});

export async function createTicketCategory(input: z.infer<typeof createTicketCategorySchema>) {
  try {
    const userId = await requireAdmin();
    await ensureDefaultTicketCategories();

    const parsed = createTicketCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    const rawSlug = parsed.data.slug?.trim() || slugifyTicketCategory(parsed.data.name);
    if (!rawSlug) return { success: false, error: "Invalid slug" };
    if (RESERVED_TICKET_CATEGORY_SLUGS.has(rawSlug)) {
      return { success: false, error: "Slug is reserved" };
    }

    const collection = await getCollection<TicketCategoryDefinition>("ticket_categories");
    const existing = await collection.findOne({ slug: rawSlug });
    if (existing) return { success: false, error: "A category with this slug already exists" };

    const now = new Date();
    await collection.insertOne({
      name: parsed.data.name.trim(),
      slug: rawSlug,
      isActive: true,
      isSystem: false,
      sortOrder: 100,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    } as any);

    revalidatePath("/admin/settings");
    revalidatePath("/admin/tickets/new");
    revalidatePath("/dashboard/tickets/new");

    return { success: true };
  } catch (error: any) {
    console.error("Create ticket category error:", error);
    return { success: false, error: error.message || "Failed to create category" };
  }
}

const updateTicketCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function updateTicketCategory(input: z.infer<typeof updateTicketCategorySchema>) {
  try {
    const userId = await requireAdmin();
    await ensureDefaultTicketCategories();

    const parsed = updateTicketCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    if (!ObjectId.isValid(parsed.data.id)) {
      return { success: false, error: "Invalid category id" };
    }

    const collection = await getCollection<TicketCategoryDefinition>("ticket_categories");
    const objectId = new ObjectId(parsed.data.id);
    const existing = await collection.findOne({ _id: objectId });
    if (!existing) return { success: false, error: "Category not found" };

    const updateDoc: Partial<TicketCategoryDefinition> & Record<string, any> = {
      updatedAt: new Date(),
      updatedBy: userId,
    };

    if (typeof parsed.data.name === "string") updateDoc.name = parsed.data.name.trim();
    if (typeof parsed.data.isActive === "boolean") updateDoc.isActive = parsed.data.isActive;
    if (typeof parsed.data.sortOrder === "number") updateDoc.sortOrder = parsed.data.sortOrder;

    if (typeof parsed.data.slug === "string") {
      if (existing.isSystem) return { success: false, error: "System category slug cannot be changed" };
      const nextSlug = slugifyTicketCategory(parsed.data.slug);
      if (!nextSlug) return { success: false, error: "Invalid slug" };
      if (RESERVED_TICKET_CATEGORY_SLUGS.has(nextSlug)) {
        return { success: false, error: "Slug is reserved" };
      }
      if (nextSlug !== existing.slug) {
        const slugExists = await collection.findOne({ slug: nextSlug });
        if (slugExists) return { success: false, error: "A category with this slug already exists" };
        updateDoc.slug = nextSlug;
      }
    }

    await collection.updateOne({ _id: objectId }, { $set: updateDoc });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/tickets/new");
    revalidatePath("/dashboard/tickets/new");

    return { success: true };
  } catch (error: any) {
    console.error("Update ticket category error:", error);
    return { success: false, error: error.message || "Failed to update category" };
  }
}

export async function deleteTicketCategory(id: string) {
  try {
    await requireAdmin();

    if (!ObjectId.isValid(id)) {
      return { success: false, error: "Invalid category id" };
    }

    const collection = await getCollection<TicketCategoryDefinition>("ticket_categories");
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) return { success: false, error: "Category not found" };
    if (existing.isSystem) return { success: false, error: "System categories cannot be deleted" };

    await collection.deleteOne({ _id: new ObjectId(id) });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/tickets/new");
    revalidatePath("/dashboard/tickets/new");

    return { success: true };
  } catch (error: any) {
    console.error("Delete ticket category error:", error);
    return { success: false, error: error.message || "Failed to delete category" };
  }
}
