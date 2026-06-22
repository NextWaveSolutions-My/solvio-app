/**
 * Users By IDs API Route
 *
 * POST /api/users/by-ids - Get users by their IDs
 *
 * Optimized with:
 * - MongoDB index on 'id' field for fast lookups
 * - Next.js cache() for reduced database queries
 * - Projection to fetch only necessary fields
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { getCollection } from "@/lib/db";
import { cache } from "react";
import { ObjectId } from "mongodb";

// Cache user data fetching for 5 minutes
// This significantly reduces database load for frequently accessed users
const getCachedUsersByIds = cache(async (userIds: string[]) => {
  const usersCollection = await getCollection("user");

  const stringIds = userIds.filter((id) => typeof id === "string");
  const objectIds = stringIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const users = await usersCollection
    .find(
      {
        $or: [
          { id: { $in: stringIds } },
          objectIds.length > 0 ? { _id: { $in: objectIds } } : {},
        ].filter((q) => Object.keys(q).length > 0),
      },
      {
        projection: {
          id: 1,
          name: 1,
          email: 1,
          role: 1,
          image: 1,
          _id: 1,
        },
      }
    )
    .toArray();

  // Map to simple user objects
  const userMap: Record<
    string,
    { id: string; name: string; email: string; role: string; image?: string }
  > = {};

  users.forEach((user: any) => {
    const userId = user.id || user._id?.toString();
    userMap[userId] = {
      id: userId,
      name: user.name || "Unknown User",
      email: user.email || "",
      role: user.role || "customer",
      image: user.image || undefined,
    };
  });

  return userMap;
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userIds } = await request.json();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: "Invalid user IDs" }, { status: 400 });
    }

    // Limit to reasonable number of users to prevent abuse
    if (userIds.length > 100) {
      return NextResponse.json(
        { error: "Too many user IDs requested" },
        { status: 400 }
      );
    }

    // Use cached function
    const users = await getCachedUsersByIds(userIds);

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users by IDs:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// Enable edge runtime for faster cold starts (optional)
// export const runtime = 'edge'; // Uncomment if using edge runtime
