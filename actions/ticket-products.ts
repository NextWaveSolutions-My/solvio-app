"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession, requirePermissionOrThrow } from "@/lib/auth-utils";
import {
  RESERVED_TICKET_PRODUCT_SLUGS,
  slugifyTicketProduct,
} from "@/lib/ticket-products";
import type { ApiResponse, TicketProductDefinition, UserRole } from "@/types";

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

export async function getTicketProducts(): Promise<
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

    const collection = await getCollection<TicketProductDefinition>(
      "ticket_products"
    );
    const products = await collection
      .find({})
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    return {
      success: true,
      data: products.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        slug: d.slug,
        isActive: d.isActive,
        isSystem: d.isSystem,
        sortOrder: d.sortOrder ?? 0,
      })),
    };
  } catch (error: any) {
    console.error("Get ticket products error:", error);
    return { success: false, error: error.message || "Failed to load products" };
  }
}

export async function getActiveTicketProducts(): Promise<
  ApiResponse<Array<{ slug: string; name: string }>>
> {
  try {
    await requireSignedIn();

    const collection = await getCollection<TicketProductDefinition>(
      "ticket_products"
    );
    const products = await collection
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    return {
      success: true,
      data: products.map((d) => ({ slug: d.slug, name: d.name })),
    };
  } catch (error: any) {
    console.error("Get active ticket products error:", error);
    return { success: false, error: error.message || "Failed to load products" };
  }
}

const createTicketProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: z.string().optional(),
});

export async function createTicketProduct(
  input: z.infer<typeof createTicketProductSchema>
) {
  try {
    const userId = await requireAdmin();

    const parsed = createTicketProductSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    const rawSlug =
      parsed.data.slug?.trim() || slugifyTicketProduct(parsed.data.name);
    if (!rawSlug) return { success: false, error: "Invalid slug" };
    if (RESERVED_TICKET_PRODUCT_SLUGS.has(rawSlug)) {
      return { success: false, error: "Slug is reserved" };
    }

    const collection = await getCollection<TicketProductDefinition>(
      "ticket_products"
    );
    const existing = await collection.findOne({ slug: rawSlug });
    if (existing)
      return { success: false, error: "A product with this slug already exists" };

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
    console.error("Create ticket product error:", error);
    return { success: false, error: error.message || "Failed to create product" };
  }
}

const updateTicketProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function updateTicketProduct(
  input: z.infer<typeof updateTicketProductSchema>
) {
  try {
    const userId = await requireAdmin();

    const parsed = updateTicketProductSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    if (!ObjectId.isValid(parsed.data.id)) {
      return { success: false, error: "Invalid product id" };
    }

    const collection = await getCollection<TicketProductDefinition>(
      "ticket_products"
    );
    const objectId = new ObjectId(parsed.data.id);
    const existing = await collection.findOne({ _id: objectId });
    if (!existing) return { success: false, error: "Product not found" };

    const updateDoc: Partial<TicketProductDefinition> & Record<string, any> = {
      updatedAt: new Date(),
      updatedBy: userId,
    };

    if (typeof parsed.data.name === "string") updateDoc.name = parsed.data.name.trim();
    if (typeof parsed.data.isActive === "boolean")
      updateDoc.isActive = parsed.data.isActive;
    if (typeof parsed.data.sortOrder === "number")
      updateDoc.sortOrder = parsed.data.sortOrder;

    if (typeof parsed.data.slug === "string") {
      if (existing.isSystem)
        return { success: false, error: "System product slug cannot be changed" };
      const nextSlug = slugifyTicketProduct(parsed.data.slug);
      if (!nextSlug) return { success: false, error: "Invalid slug" };
      if (RESERVED_TICKET_PRODUCT_SLUGS.has(nextSlug)) {
        return { success: false, error: "Slug is reserved" };
      }
      if (nextSlug !== existing.slug) {
        const slugExists = await collection.findOne({ slug: nextSlug });
        if (slugExists)
          return { success: false, error: "A product with this slug already exists" };
        updateDoc.slug = nextSlug;
      }
    }

    await collection.updateOne({ _id: objectId }, { $set: updateDoc });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/tickets/new");
    revalidatePath("/dashboard/tickets/new");

    return { success: true };
  } catch (error: any) {
    console.error("Update ticket product error:", error);
    return { success: false, error: error.message || "Failed to update product" };
  }
}

export async function deleteTicketProduct(id: string) {
  try {
    await requireAdmin();

    if (!ObjectId.isValid(id)) {
      return { success: false, error: "Invalid product id" };
    }

    const collection = await getCollection<TicketProductDefinition>(
      "ticket_products"
    );
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) return { success: false, error: "Product not found" };
    if (existing.isSystem)
      return { success: false, error: "System products cannot be deleted" };

    await collection.deleteOne({ _id: new ObjectId(id) });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/tickets/new");
    revalidatePath("/dashboard/tickets/new");

    return { success: true };
  } catch (error: any) {
    console.error("Delete ticket product error:", error);
    return { success: false, error: error.message || "Failed to delete product" };
  }
}
