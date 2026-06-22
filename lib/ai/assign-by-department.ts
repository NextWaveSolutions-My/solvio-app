import { getCollection } from "@/lib/db";
import type { User } from "@/types";

const REQUEST_COLLECTIONS = [
  "tickets",
  "installation_requests",
  "customization_requests",
  "service_requests",
] as const;

const ACTIVE_STATUSES = [
  "open",
  "scheduled_meeting",
  "in_progress",
  "waiting_on_customer",
];

/**
 * Pick the support agent an auto-created ticket should go to.
 *
 * 1. Candidates = users with role "support"; if none exist, fall back to admins.
 * 2. If `departmentSlug` is given, prefer agents who cover that department
 *    (User.departmentSlugs). Fall back to all support agents if none match.
 * 3. Among candidates, choose the least-loaded (fewest active assigned
 *    tickets across all request collections). Ties broken randomly.
 *
 * Returns the agent's user id, or null when there are no support agents
 * (the ticket is still created, just unassigned).
 */
export async function assignByDepartment(
  departmentSlug?: string
): Promise<string | null> {
  const userCol = await getCollection<User>("user");
  const support = await userCol
    .find({ role: "support" })
    .project<Pick<User, "id" | "departmentSlugs">>({
      id: 1,
      departmentSlugs: 1,
    })
    .toArray();

  const staff =
    support.length > 0
      ? support
      : await userCol
          .find({ role: "admin" })
          .project<Pick<User, "id" | "departmentSlugs">>({
            id: 1,
            departmentSlugs: 1,
          })
          .toArray();

  if (staff.length === 0) return null;

  let candidates = staff;
  if (departmentSlug) {
    const matching = staff.filter((u) =>
      (u.departmentSlugs ?? []).includes(departmentSlug)
    );
    if (matching.length > 0) candidates = matching;
  }

  const candidateIds = candidates.map((c) => c.id).filter(Boolean);
  if (candidateIds.length === 0) return null;
  if (candidateIds.length === 1) return candidateIds[0];

  const load = new Map<string, number>();
  for (const id of candidateIds) load.set(id, 0);

  for (const name of REQUEST_COLLECTIONS) {
    const col = await getCollection(name);
    const rows = await col
      .find({
        assignedToId: { $in: candidateIds },
        status: { $in: ACTIVE_STATUSES },
      })
      .project({ assignedToId: 1 })
      .toArray();
    for (const r of rows) {
      const aid = (r as { assignedToId?: string }).assignedToId;
      if (aid && load.has(aid)) load.set(aid, (load.get(aid) ?? 0) + 1);
    }
  }

  let min = Infinity;
  let leastLoaded: string[] = [];
  for (const id of candidateIds) {
    const n = load.get(id) ?? 0;
    if (n < min) {
      min = n;
      leastLoaded = [id];
    } else if (n === min) {
      leastLoaded.push(id);
    }
  }

  return leastLoaded[Math.floor(Math.random() * leastLoaded.length)];
}
