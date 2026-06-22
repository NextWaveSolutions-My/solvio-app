"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession, requirePermissionOrThrow } from "@/lib/auth-utils";
import {
  RESERVED_TICKET_DEPARTMENT_SLUGS,
  ensureDefaultTicketDepartments,
  slugifyTicketDepartment,
} from "@/lib/ticket-departments";
import type { ApiResponse, TicketDepartmentDefinition, UserRole } from "@/types";

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

export async function getTicketDepartments(): Promise<
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
    await ensureDefaultTicketDepartments();

    const collection = await getCollection<TicketDepartmentDefinition>(
      "ticket_departments"
    );
    const departments = await collection
      .find({})
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    return {
      success: true,
      data: departments.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        slug: d.slug,
        isActive: d.isActive,
        isSystem: d.isSystem,
        sortOrder: d.sortOrder ?? 0,
      })),
    };
  } catch (error: any) {
    console.error("Get ticket departments error:", error);
    return { success: false, error: error.message || "Failed to load departments" };
  }
}

export async function getActiveTicketDepartments(): Promise<
  ApiResponse<Array<{ slug: string; name: string }>>
> {
  try {
    await requireSignedIn();
    await ensureDefaultTicketDepartments();

    const collection = await getCollection<TicketDepartmentDefinition>(
      "ticket_departments"
    );
    const departments = await collection
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    return {
      success: true,
      data: departments.map((d) => ({ slug: d.slug, name: d.name })),
    };
  } catch (error: any) {
    console.error("Get active ticket departments error:", error);
    return { success: false, error: error.message || "Failed to load departments" };
  }
}

const createTicketDepartmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  slug: z.string().optional(),
});

export async function createTicketDepartment(
  input: z.infer<typeof createTicketDepartmentSchema>
) {
  try {
    const userId = await requireAdmin();
    await ensureDefaultTicketDepartments();

    const parsed = createTicketDepartmentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    const rawSlug =
      parsed.data.slug?.trim() || slugifyTicketDepartment(parsed.data.name);
    if (!rawSlug) return { success: false, error: "Invalid slug" };
    if (RESERVED_TICKET_DEPARTMENT_SLUGS.has(rawSlug)) {
      return { success: false, error: "Slug is reserved" };
    }

    const collection = await getCollection<TicketDepartmentDefinition>(
      "ticket_departments"
    );
    const existing = await collection.findOne({ slug: rawSlug });
    if (existing)
      return { success: false, error: "A department with this slug already exists" };

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
    console.error("Create ticket department error:", error);
    return { success: false, error: error.message || "Failed to create department" };
  }
}

const updateTicketDepartmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function updateTicketDepartment(
  input: z.infer<typeof updateTicketDepartmentSchema>
) {
  try {
    const userId = await requireAdmin();
    await ensureDefaultTicketDepartments();

    const parsed = updateTicketDepartmentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    if (!ObjectId.isValid(parsed.data.id)) {
      return { success: false, error: "Invalid department id" };
    }

    const collection = await getCollection<TicketDepartmentDefinition>(
      "ticket_departments"
    );
    const objectId = new ObjectId(parsed.data.id);
    const existing = await collection.findOne({ _id: objectId });
    if (!existing) return { success: false, error: "Department not found" };

    const updateDoc: Partial<TicketDepartmentDefinition> & Record<string, any> = {
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
        return { success: false, error: "System department slug cannot be changed" };
      const nextSlug = slugifyTicketDepartment(parsed.data.slug);
      if (!nextSlug) return { success: false, error: "Invalid slug" };
      if (RESERVED_TICKET_DEPARTMENT_SLUGS.has(nextSlug)) {
        return { success: false, error: "Slug is reserved" };
      }
      if (nextSlug !== existing.slug) {
        const slugExists = await collection.findOne({ slug: nextSlug });
        if (slugExists)
          return { success: false, error: "A department with this slug already exists" };
        updateDoc.slug = nextSlug;
      }
    }

    await collection.updateOne({ _id: objectId }, { $set: updateDoc });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/tickets/new");
    revalidatePath("/dashboard/tickets/new");

    return { success: true };
  } catch (error: any) {
    console.error("Update ticket department error:", error);
    return { success: false, error: error.message || "Failed to update department" };
  }
}

export async function deleteTicketDepartment(id: string) {
  try {
    await requireAdmin();

    if (!ObjectId.isValid(id)) {
      return { success: false, error: "Invalid department id" };
    }

    const collection = await getCollection<TicketDepartmentDefinition>(
      "ticket_departments"
    );
    const existing = await collection.findOne({ _id: new ObjectId(id) });
    if (!existing) return { success: false, error: "Department not found" };
    if (existing.isSystem)
      return { success: false, error: "System departments cannot be deleted" };

    await collection.deleteOne({ _id: new ObjectId(id) });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/tickets/new");
    revalidatePath("/dashboard/tickets/new");

    return { success: true };
  } catch (error: any) {
    console.error("Delete ticket department error:", error);
    return { success: false, error: error.message || "Failed to delete department" };
  }
}
