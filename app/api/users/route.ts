/**
 * Users API Route
 *
 * GET /api/users - Get all users (for conversation creation)
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { getCollection } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const usersCollection = await getCollection("user");

    // Get all users, sorted by name
    const users = await usersCollection.find({}).sort({ name: 1 }).toArray();

    // Map to simple user objects with only necessary fields
    const simpleUsers = users.map((user: any) => ({
      id: user.id || user._id?.toString(),
      name: user.name || "Unknown User",
      email: user.email,
      role: user.role || "customer",
      image: user.image || null,
    }));

    return NextResponse.json({ users: simpleUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
