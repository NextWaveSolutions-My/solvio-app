"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-utils";
import { getCollection } from "@/lib/db";
import { uploadFile, isFileUploadsEnabled } from "@/lib/storage";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validations";
import type {
  ApiResponse,
  User,
  UpdateProfileFormData,
  ChangePasswordFormData,
} from "@/types";
import { ObjectId } from "mongodb";

// Import better-auth's password utilities
import {
  hashPassword as betterAuthHashPassword,
  verifyPassword as betterAuthVerifyPassword,
} from "better-auth/crypto";

// Legacy password verification for old scrypt-based passwords
async function verifyLegacyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const { promisify } = await import("util");
    const { scrypt, timingSafeEqual } = await import("crypto");
    const scryptAsync = promisify(scrypt);

    const [salt, keyHex] = stored.split(":");
    if (!salt || !keyHex) return false;
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    const storedKey = Buffer.from(keyHex, "hex");
    if (storedKey.length !== derivedKey.length) return false;
    return timingSafeEqual(storedKey, derivedKey);
  } catch {
    return false;
  }
}

// Unified password verification that tries both better-auth and legacy formats
async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  // Try better-auth's verifyPassword first (bcrypt/argon2)
  try {
    const result = await betterAuthVerifyPassword({ password, hash: stored });
    if (result) return true;
  } catch {
    // If better-auth's method fails, try legacy scrypt
  }

  // Fallback to legacy scrypt format (salt:hash)
  if (stored.includes(":")) {
    return await verifyLegacyPassword(password, stored);
  }

  return false;
}

// Use better-auth's hashPassword for new passwords
async function hashPassword(password: string): Promise<string> {
  return await betterAuthHashPassword(password);
}

// Get current authenticated user's full profile
export async function getCurrentUserProfile(): Promise<ApiResponse<User>> {
  try {
    const session = await requireAuth();
    const users = await getCollection<User>("user");

    // Try by id first, then fallback to _id for older records
    const userId = session.user.id;
    let user = await users.findOne({ id: userId } as any);
    if (!user && ObjectId.isValid(userId)) {
      user = await users.findOne({ _id: new ObjectId(userId) } as any);
    }
    if (!user) {
      return { success: false, error: "User not found" };
    }
    // Serialize to plain object to avoid Date/ObjectId issues
    const serialized = JSON.parse(JSON.stringify(user));
    return { success: true, data: serialized };
  } catch (error: any) {
    console.error("getCurrentUserProfile error:", error);
    return { success: false, error: error.message || "Failed to load profile" };
  }
}

// Update profile: name, email, optional image URL
export async function updateProfile(
  data: UpdateProfileFormData
): Promise<ApiResponse<void>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const validated = updateProfileSchema.parse(data);

    const users = await getCollection<User>("user");

    // Find existing user by id, with fallback to _id (older records)
    let existing = await users.findOne({ id: userId } as any);
    let updateFilter: any = { id: userId };
    if (!existing && ObjectId.isValid(userId)) {
      const byObjectId = await users.findOne({
        _id: new ObjectId(userId),
      } as any);
      if (byObjectId) {
        existing = byObjectId;
        updateFilter = { _id: new ObjectId(userId) } as any;
      }
    }
    if (!existing) {
      return { success: false, error: "User not found" };
    }

    // Ensure email uniqueness if changed
    if (validated.email !== existing.email) {
      const emailInUse = await users.findOne({
        email: validated.email,
        id: { $ne: userId },
      } as any);
      if (emailInUse) {
        return {
          success: false,
          error: "A user with this email already exists",
        };
      }
    }

    const setData: Partial<User> & { updatedAt: Date } = {
      name: validated.name,
      email: validated.email,
      updatedAt: new Date(),
    } as any;
    const unsetData: Record<string, ""> = {};

    // Optional fields: image, phone, envatoUsername
    if (typeof validated.image !== "undefined") {
      if (validated.image && validated.image.length > 0) {
        (setData as any).image = validated.image;
      } else {
        unsetData.image = "";
      }
    }
    if (typeof validated.phone !== "undefined") {
      const trimmed = (validated.phone || "").trim();
      if (trimmed.length > 0) (setData as any).phone = trimmed;
      else unsetData.phone = "";
    }
    if (typeof validated.envatoUsername !== "undefined") {
      const trimmed = (validated.envatoUsername || "").trim();
      if (trimmed.length > 0) (setData as any).envatoUsername = trimmed;
      else unsetData.envatoUsername = "";
    }
    if (typeof validated.country !== "undefined") {
      const trimmed = (validated.country || "").trim();
      if (trimmed.length > 0) (setData as any).country = trimmed;
      else unsetData.country = "";
    }

    // If this user doc doesn't yet have an 'id' field, add it for forward-compat
    if (!(existing as any).id) {
      (setData as any).id = userId;
    }

    const updateOps: any = { $set: setData };
    if (Object.keys(unsetData).length > 0) updateOps.$unset = unsetData;

    await users.updateOne(updateFilter, updateOps);

    // If email changed, sync account.accountId for credential provider
    if (validated.email !== existing.email) {
      try {
        const accounts = await getCollection("account");
        await accounts.updateMany(
          { userId, providerId: "email" },
          {
            $set: { accountId: validated.email, updatedAt: new Date() },
          }
        );
      } catch (e) {
        console.warn("Failed to sync account email for user", userId, e);
      }
    }

    revalidatePath("/admin/profile");
    revalidatePath("/dashboard/profile");
    revalidatePath("/profile");
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return { success: true, message: "Profile updated successfully" };
  } catch (error: any) {
    console.error("updateProfile error:", error);
    return {
      success: false,
      error: error.message || "Failed to update profile",
    };
  }
}

// Upload and set avatar image
export async function uploadProfileAvatar(
  formData: FormData
): Promise<ApiResponse<{ url: string }>> {
  try {
    if (!isFileUploadsEnabled()) {
      return { success: false, error: "File uploads are not enabled" };
    }

    const session = await requireAuth();
    const userId = session.user.id;

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { success: false, error: "No file provided" };
    }

    const uploaded = await uploadFile({ file, folder: "avatars", userId });

    const users = await getCollection<User>("user");
    // Ensure we update the correct user even for older records missing 'id'
    let updateFilter: any = { id: userId };
    const existing = await users.findOne({ id: userId } as any);
    if (!existing && ObjectId.isValid(userId)) {
      updateFilter = { _id: new ObjectId(userId) } as any;
    }
    await users.updateOne(updateFilter, {
      $set: { image: uploaded.url, updatedAt: new Date() },
    });

    revalidatePath("/admin/profile");
    revalidatePath("/dashboard/profile");
    revalidatePath("/profile");
    revalidatePath("/admin");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { url: uploaded.url },
      message: "Avatar updated successfully",
    };
  } catch (error: any) {
    console.error("uploadProfileAvatar error:", error);
    return {
      success: false,
      error: error.message || "Failed to upload avatar",
    };
  }
}

// Change password
export async function changePassword(
  data: ChangePasswordFormData
): Promise<ApiResponse<void>> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const validated = changePasswordSchema.parse(data);

    const accounts = await getCollection("account");
    const userEmail = session.user.email as string;

    // Build candidate filters (prefer docs that actually have a password)
    const primaryFilters: any[] = [{ userId, password: { $exists: true } }];
    if (ObjectId.isValid(userId)) {
      primaryFilters.push({
        userId: new ObjectId(userId),
        password: { $exists: true },
      });
    }
    if (userEmail) {
      primaryFilters.push({
        accountId: userEmail,
        password: { $exists: true },
      });
    }

    let candidates = await accounts
      .find({ $or: primaryFilters } as any)
      .toArray();

    // Last resort: look up any account docs by user/email (even if password missing)
    if (candidates.length === 0) {
      const fallbackFilters: any[] = [{ userId }];
      if (ObjectId.isValid(userId))
        fallbackFilters.push({ userId: new ObjectId(userId) });
      if (userEmail) fallbackFilters.push({ accountId: userEmail });
      candidates = await accounts
        .find({ $or: fallbackFilters } as any)
        .toArray();
    }

    // Verify current password against all candidates with a password
    let matchedAccount: any = null;
    for (const acc of candidates) {
      if (!acc?.password) continue;
      const ok = await verifyPassword(
        validated.currentPassword,
        acc.password as string
      );
      if (ok) {
        matchedAccount = acc;
        break;
      }
    }

    if (!matchedAccount) {
      // No account with a matching password found
      // If there are no password-bearing accounts, show the availability error; otherwise incorrect
      const hasPasswordDoc = candidates.some((c: any) => !!c?.password);
      if (!hasPasswordDoc) {
        return {
          success: false,
          error:
            "Password change is not available for your account. Try logging in with email/password.",
        };
      }
      return { success: false, error: "Current password is incorrect" };
    }

    const newHashed = await hashPassword(validated.newPassword);
    // Update the matched account document by _id to be precise
    await accounts.updateOne({ _id: matchedAccount._id } as any, {
      $set: { password: newHashed, updatedAt: new Date() },
    });

    revalidatePath("/admin/profile");
    revalidatePath("/dashboard/profile");
    revalidatePath("/profile");

    return { success: true, message: "Password updated successfully" };
  } catch (error: any) {
    console.error("changePassword error:", error);
    return {
      success: false,
      error: error.message || "Failed to update password",
    };
  }
}
