import { getCollection } from "@/lib/db";
import type { TicketDepartmentDefinition } from "@/types";

export const RESERVED_TICKET_DEPARTMENT_SLUGS = new Set<string>([]);

export const DEFAULT_TICKET_DEPARTMENTS: Array<{
  name: string;
  slug: string;
  sortOrder: number;
}> = [
  { name: "Technical Support", slug: "technical-support", sortOrder: 10 },
  { name: "Billing", slug: "billing", sortOrder: 20 },
  { name: "Sales", slug: "sales", sortOrder: 30 },
  { name: "General", slug: "general", sortOrder: 40 },
];

export function slugifyTicketDepartment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function ensureDefaultTicketDepartments() {
  const collection = await getCollection<TicketDepartmentDefinition>(
    "ticket_departments"
  );
  const count = await collection.countDocuments();
  if (count > 0) return;

  const now = new Date();
  await collection.insertMany(
    DEFAULT_TICKET_DEPARTMENTS.map((d) => ({
      name: d.name,
      slug: d.slug,
      isActive: true,
      isSystem: true,
      sortOrder: d.sortOrder,
      createdAt: now,
      updatedAt: now,
      createdBy: "system",
      updatedBy: "system",
    })) as any
  );
}

export async function validateTicketDepartmentForTicketCreation(
  department: string | undefined | null
) {
  if (!department) return { ok: true as const };
  if (RESERVED_TICKET_DEPARTMENT_SLUGS.has(department)) {
    return { ok: false as const, error: "Invalid department" };
  }

  await ensureDefaultTicketDepartments();
  const collection = await getCollection<TicketDepartmentDefinition>(
    "ticket_departments"
  );
  const found = await collection.findOne({ slug: department, isActive: true });
  if (!found) return { ok: false as const, error: "Invalid department" };
  return { ok: true as const };
}
