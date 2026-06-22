import { getCollection } from "@/lib/db";
import type { TicketCategoryDefinition } from "@/types";

export const RESERVED_TICKET_CATEGORY_SLUGS = new Set(["service"]);

export const DEFAULT_TICKET_CATEGORIES: Array<{
  name: string;
  slug: string;
  sortOrder: number;
}> = [
  { name: "Bug Report", slug: "bug", sortOrder: 10 },
  { name: "Feature Request", slug: "feature_request", sortOrder: 20 },
  { name: "Technical Support", slug: "technical_support", sortOrder: 30 },
  { name: "Account Issue", slug: "account", sortOrder: 40 },
  { name: "General Inquiry", slug: "general", sortOrder: 50 },
];

export function slugifyTicketCategory(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function ensureDefaultTicketCategories() {
  const collection = await getCollection<TicketCategoryDefinition>("ticket_categories");
  const count = await collection.countDocuments();
  if (count > 0) return;

  const now = new Date();
  await collection.insertMany(
    DEFAULT_TICKET_CATEGORIES.map((c) => ({
      name: c.name,
      slug: c.slug,
      isActive: true,
      isSystem: true,
      sortOrder: c.sortOrder,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
      updatedBy: "system",
    })) as any
  );
}

export async function validateTicketCategoryForTicketCreation(category: string) {
  if (!category) return { ok: false as const, error: "Category is required" };
  if (RESERVED_TICKET_CATEGORY_SLUGS.has(category)) {
    return { ok: false as const, error: "Invalid category" };
  }

  await ensureDefaultTicketCategories();
  const collection = await getCollection<TicketCategoryDefinition>("ticket_categories");
  const found = await collection.findOne({ slug: category, isActive: true });
  if (!found) return { ok: false as const, error: "Invalid category" };
  return { ok: true as const };
}

