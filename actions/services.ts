"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession, requirePermissionOrThrow } from "@/lib/auth-utils";
import type { ApiResponse, Service, UserRole } from "@/types";
import {
  upsertKnowledgeEmbedding,
  removeKnowledgeEmbedding,
} from "@/lib/ai/knowledge-index";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requireSignedIn() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const role = ((session.user as any)?.role ?? "customer") as UserRole;
  return { session, role };
}

async function requireStaff() {
  const session = await requirePermissionOrThrow("services.manage", {
    message: "Forbidden: Services manage access required",
  });
  const role = ((session.user as { role?: UserRole })?.role ?? "customer") as UserRole;
  return { session, role };
}

async function requireAdmin() {
  const { session, role } = await requireStaff();
  if (role !== "admin") throw new Error("Forbidden: Admin access required");
  return session;
}

async function ensureDefaultServices() {
  const servicesCollection = await getCollection<Service>("services");
  const count = await servicesCollection.countDocuments();
  if (count > 0) {
    await servicesCollection.updateMany({}, { $addToSet: { roles: "customer" } });
    await servicesCollection.updateMany(
      { slug: "customization", href: { $ne: "/admin/services/customization" } },
      { $set: { href: "/admin/services/customization" } },
    );
    await servicesCollection.updateMany(
      { slug: "installation", href: { $ne: "/admin/services/installation" } },
      { $set: { href: "/admin/services/installation" } },
    );
    return;
  }

  const now = new Date();
  await servicesCollection.insertMany([
    {
      name: "Customization",
      slug: "customization",
      href: "/admin/services/customization",
      iconKey: "wrench",
      roles: ["admin", "support", "customer"],
      isActive: true,
      sortOrder: 10,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
      updatedBy: "system",
    } as any,
    {
      name: "Installation",
      slug: "installation",
      href: "/admin/services/installation",
      iconKey: "download",
      roles: ["admin", "support", "customer"],
      isActive: true,
      sortOrder: 20,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
      updatedBy: "system",
    } as any,
  ]);
}

const createServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  iconKey: z.string().optional(),
  href: z.string().optional(),
});

export async function getServicesForNav(): Promise<
  ApiResponse<
    Array<{
      id: string;
      name: string;
      slug: string;
      href: string;
      iconKey: string;
      roles: UserRole[];
    }>
  >
> {
  try {
    const { role } = await requireSignedIn();
    await ensureDefaultServices();

    const servicesCollection = await getCollection<Service>("services");
    const services = await servicesCollection
      .find({ isActive: true, roles: role })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    return {
      success: true,
      data: services.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        slug: s.slug,
        href: s.href,
        iconKey: s.iconKey || "briefcase",
        roles: s.roles,
      })),
    };
  } catch (error: any) {
    console.error("Get services for nav error:", error);
    return {
      success: false,
      error: error.message || "Failed to load services",
    };
  }
}

export async function getAllServices(): Promise<
  ApiResponse<
    Array<{
      id: string;
      name: string;
      slug: string;
      href: string;
      iconKey: string;
      roles: UserRole[];
      isActive: boolean;
      sortOrder: number;
      description?: string;
    }>
  >
> {
  try {
    await requireAdmin();
    await ensureDefaultServices();

    const servicesCollection = await getCollection<Service>("services");
    const services = await servicesCollection
      .find({})
      .sort({ sortOrder: 1, name: 1 })
      .toArray();

    return {
      success: true,
      data: services.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        slug: s.slug,
        href: s.href,
        iconKey: s.iconKey || "briefcase",
        roles: s.roles,
        isActive: s.isActive,
        sortOrder: s.sortOrder ?? 0,
        description: s.description,
      })),
    };
  } catch (error: any) {
    console.error("Get all services error:", error);
    return {
      success: false,
      error: error.message || "Failed to load services",
    };
  }
}

export async function getServiceBySlug(slug: string): Promise<
  ApiResponse<{
    id: string;
    name: string;
    slug: string;
    href: string;
    iconKey: string;
    description?: string;
  }>
> {
  try {
    await requireSignedIn();
    await ensureDefaultServices();

    const servicesCollection = await getCollection<Service>("services");
    const service = await servicesCollection.findOne({ slug, isActive: true });
    if (!service) {
      return { success: false, error: "Service not found" };
    }

    return {
      success: true,
      data: {
        id: service._id.toString(),
        name: service.name,
        slug: service.slug,
        href: service.href,
        iconKey: service.iconKey || "briefcase",
        description: service.description,
      },
    };
  } catch (error: any) {
    console.error("Get service by slug error:", error);
    return {
      success: false,
      error: error.message || "Failed to load service",
    };
  }
}

export async function createService(input: z.infer<typeof createServiceSchema>) {
  try {
    const session = await requireAdmin();
    const userId = (session.user as any)?.id ?? "unknown";

    const parsed = createServiceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    const rawSlug = parsed.data.slug?.trim() || slugify(parsed.data.name);
    if (!rawSlug) {
      return { success: false, error: "Invalid slug" };
    }

    const servicesCollection = await getCollection<Service>("services");

    const existing = await servicesCollection.findOne({ slug: rawSlug });
    if (existing) {
      return { success: false, error: "A service with this slug already exists" };
    }

    const now = new Date();
    const href =
      parsed.data.href?.trim() || `/admin/services/${encodeURIComponent(rawSlug)}`;

    const newId = new ObjectId();
    const name = parsed.data.name.trim();
    const description = parsed.data.description?.trim() || "";

    await servicesCollection.insertOne({
      _id: newId,
      name,
      slug: rawSlug,
      href,
      iconKey: parsed.data.iconKey?.trim() || "briefcase",
      roles: ["admin", "support", "customer"],
      isActive: true,
      sortOrder: 100,
      description,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    } as any);

    if (description) {
      void upsertKnowledgeEmbedding({
        sourceType: "service",
        sourceId: newId.toString(),
        title: name,
        content: description,
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/services");

    return { success: true };
  } catch (error: any) {
    console.error("Create service error:", error);
    return { success: false, error: error.message || "Failed to create service" };
  }
}

const updateServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  href: z.string().min(1).optional(),
  iconKey: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export async function updateService(input: z.infer<typeof updateServiceSchema>) {
  try {
    const session = await requireAdmin();
    const userId = (session.user as any)?.id ?? "unknown";

    const parsed = updateServiceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    if (!ObjectId.isValid(parsed.data.id)) {
      return { success: false, error: "Invalid service id" };
    }

    const servicesCollection = await getCollection<Service>("services");
    const objectId = new ObjectId(parsed.data.id);
    const existing = await servicesCollection.findOne({ _id: objectId });
    if (!existing) return { success: false, error: "Service not found" };

    const updateDoc: Partial<Service> & Record<string, any> = {
      updatedAt: new Date(),
      updatedBy: userId,
    };

    if (typeof parsed.data.name === "string") updateDoc.name = parsed.data.name.trim();
    if (typeof parsed.data.iconKey === "string") {
      updateDoc.iconKey = parsed.data.iconKey.trim();
    }
    if (typeof parsed.data.href === "string") updateDoc.href = parsed.data.href.trim();
    if (typeof parsed.data.description === "string") {
      updateDoc.description = parsed.data.description;
    }
    if (typeof parsed.data.isActive === "boolean") updateDoc.isActive = parsed.data.isActive;
    if (typeof parsed.data.sortOrder === "number") updateDoc.sortOrder = parsed.data.sortOrder;

    if (typeof parsed.data.slug === "string") {
      const nextSlug = slugify(parsed.data.slug);
      if (!nextSlug) return { success: false, error: "Invalid slug" };
      if (nextSlug !== existing.slug) {
        const slugExists = await servicesCollection.findOne({ slug: nextSlug });
        if (slugExists) {
          return { success: false, error: "A service with this slug already exists" };
        }
        updateDoc.slug = nextSlug;
      }
    }

    await servicesCollection.updateOne({ _id: objectId }, { $set: updateDoc });

    const mergedName = (updateDoc.name as string | undefined) ?? existing.name;
    const mergedDescription =
      (updateDoc.description as string | undefined) ?? existing.description ?? "";
    const mergedActive =
      (updateDoc.isActive as boolean | undefined) ?? existing.isActive;

    if (mergedActive && mergedDescription.trim()) {
      void upsertKnowledgeEmbedding({
        sourceType: "service",
        sourceId: parsed.data.id,
        title: mergedName,
        content: mergedDescription,
      });
    } else {
      void removeKnowledgeEmbedding("service", parsed.data.id);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/services");

    return { success: true };
  } catch (error: any) {
    console.error("Update service error:", error);
    return { success: false, error: error.message || "Failed to update service" };
  }
}

export async function deleteService(id: string) {
  try {
    await requireAdmin();

    if (!ObjectId.isValid(id)) {
      return { success: false, error: "Invalid service id" };
    }

    const servicesCollection = await getCollection<Service>("services");
    await servicesCollection.deleteOne({ _id: new ObjectId(id) });
    void removeKnowledgeEmbedding("service", id);

    revalidatePath("/admin");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/services");

    return { success: true };
  } catch (error: any) {
    console.error("Delete service error:", error);
    return { success: false, error: error.message || "Failed to delete service" };
  }
}
