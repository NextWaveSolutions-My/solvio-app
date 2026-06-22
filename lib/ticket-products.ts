import { getCollection } from "@/lib/db";
import type { TicketProductDefinition } from "@/types";

export const RESERVED_TICKET_PRODUCT_SLUGS = new Set<string>([]);

export function slugifyTicketProduct(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function validateTicketProductForTicketCreation(
  product: string | undefined | null
) {
  if (!product) return { ok: true as const };
  if (RESERVED_TICKET_PRODUCT_SLUGS.has(product)) {
    return { ok: false as const, error: "Invalid product" };
  }

  const collection = await getCollection<TicketProductDefinition>(
    "ticket_products"
  );
  const found = await collection.findOne({ slug: product, isActive: true });
  if (!found) return { ok: false as const, error: "Invalid product" };
  return { ok: true as const };
}
