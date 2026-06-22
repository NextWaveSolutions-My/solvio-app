import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import type { User as UserType, UserRole } from "@/types";

/**
 * Fetches user information for a list of user IDs
 * Handles both string IDs and ObjectId lookups for backward compatibility
 *
 * @param userIds - Array of user IDs to fetch
 * @returns Record mapping user IDs to user information
 */
export async function fetchUsersByIds(
  userIds: string[]
): Promise<Record<string, { name: string; email: string; role: string }>> {
  if (userIds.length === 0) {
    return {};
  }

  const usersCollection = await getCollection<UserType>("user");
  const users: Record<string, { name: string; email: string; role: string }> =
    {};

  // First, try to fetch users by their string ID
  const usersData = await usersCollection
    .find({ id: { $in: userIds } })
    .toArray();

  usersData.forEach((user) => {
    users[user.id] = {
      name: user.name || "Unknown User",
      email: user.email || "",
      role: user.role || "customer",
    };
  });

  // Fetch any missing users by _id (fallback for old data)
  const missingUserIds = userIds.filter((userId) => !users[userId]);
  if (missingUserIds.length > 0) {
    try {
      const validObjectIds = missingUserIds.filter((id) =>
        ObjectId.isValid(id)
      );
      if (validObjectIds.length > 0) {
        const missingUsers = await usersCollection
          .find({
            _id: { $in: validObjectIds.map((id) => new ObjectId(id)) },
          })
          .toArray();

        missingUsers.forEach((user) => {
          const userId = user._id.toString();
          users[userId] = {
            name: user.name || "Unknown User",
            email: user.email || "",
            role: user.role || "customer",
          };
        });
      }
    } catch (error) {
      console.error("Error fetching missing users:", error);
    }
  }

  return users;
}

/**
 * Extracts unique user IDs from tickets (customers and assigned agents)
 *
 * @param tickets - Array of tickets
 * @returns Array of unique user IDs
 */
export function extractUserIdsFromTickets(
  tickets: Array<{ customerId: string; assignedToId?: string | null }>
): string[] {
  return [
    ...new Set([
      ...tickets.map((t) => t.customerId),
      ...tickets
        .filter((t) => t.assignedToId)
        .map((t) => t.assignedToId as string),
    ]),
  ].filter(Boolean);
}

/**
 * Get users by role(s)
 * Useful for sending notifications to all admins/support staff
 *
 * @param roles - Array of roles to filter by
 * @returns Array of user IDs
 */
export async function getUserIdsByRole(roles: UserRole[]): Promise<string[]> {
  try {
    const usersCollection = await getCollection<UserType>("user");
    const users = await usersCollection
      .find({ role: { $in: roles } })
      .project({ id: 1, _id: 1 })
      .toArray();

    return users
      .map((user) => user.id || user._id.toString())
      .filter(Boolean);
  } catch (error) {
    console.error("Error fetching users by role:", error);
    return [];
  }
}
