"use server";

import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import type { User, UserPreferences, ApiResponse } from "@/types";

/**
 * Get user preferences
 */
export async function getUserPreferences(): Promise<
  ApiResponse<UserPreferences>
> {
  try {
    const session = await requireAuth();
    const users = await getCollection<User>("user");

    let user = await users.findOne({ id: session.user.id });
    if (!user && ObjectId.isValid(session.user.id)) {
      user = await users.findOne({ _id: new ObjectId(session.user.id) });
    }

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Return preferences or default values
    const preferences: UserPreferences = user.preferences || {
      notifications: {
        clickBehavior: "detail", // Default to detail page first
      },
    };

    return {
      success: true,
      data: preferences,
    };
  } catch (error) {
    console.error(
      "Get user preferences error:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get user preferences",
    };
  }
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  preferences: UserPreferences
): Promise<ApiResponse<UserPreferences>> {
  try {
    const session = await requireAuth();
    const users = await getCollection<User>("user");

    let user = await users.findOne({ id: session.user.id });
    if (!user && ObjectId.isValid(session.user.id)) {
      user = await users.findOne({ _id: new ObjectId(session.user.id) });
    }

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Merge new preferences with existing ones (deep merge for channels)
    const updatedPreferences: UserPreferences = {
      ...user.preferences,
      notifications: {
        clickBehavior:
          preferences.notifications?.clickBehavior ??
          user.preferences?.notifications?.clickBehavior ??
          "detail",
        channels: {
          ...user.preferences?.notifications?.channels,
          ...preferences.notifications?.channels,
        },
      },
    };

    // Update user preferences in database
    await users.updateOne(
      { _id: user._id },
      {
        $set: {
          preferences: updatedPreferences,
          updatedAt: new Date(),
        },
      }
    );

    // Revalidate profile pages
    revalidatePath("/dashboard/profile");
    revalidatePath("/admin/profile");
    revalidatePath("/support-agent/profile");

    return {
      success: true,
      data: updatedPreferences,
    };
  } catch (error) {
    console.error(
      "Update user preferences error:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update user preferences",
    };
  }
}
