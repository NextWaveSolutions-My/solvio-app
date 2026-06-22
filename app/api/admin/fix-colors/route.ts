import { NextResponse } from "next/server";
import { getCollection } from "@/lib/db";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { requirePermissionOrThrow } from "@/lib/auth-utils";

/**
 * API route to fix appearance colors in the database
 * Handles black or near-black colors (e.g. "#000000", "#00000b") and missing values
 */

// Normalize hex string to lower-case 7-char form like "#aabbcc"
function normalizeHex(hex?: string): string | null {
  if (!hex || typeof hex !== "string") return null;
  const h = hex.trim().toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(h)) return null;
  return h;
}

// Consider colors "near black" if perceived brightness is very low
function isNearBlack(hex?: string): boolean {
  const h = normalizeHex(hex);
  if (!h) return false;
  const raw = h.slice(1);
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  // ITU-R BT.601 luma approximation
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness <= 20; // treat extremely dark colors as black
}

export async function POST() {
  try {
    const session = await requirePermissionOrThrow("settings.manage", {
      message: "Forbidden",
    });
    const user = session.user as { id: string };

    const settingsCollection = await getCollection<SystemSettings>("settings");
    const settings = await settingsCollection.findOne({});

    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    const appearance = {
      ...DEFAULT_SETTINGS.appearance,
      ...(settings.appearance ?? {}),
    };

    // Build updates for black/near-black or missing colors
    const updates: Record<string, string> = {};
    const changes: string[] = [];

    if (!appearance.successColor || isNearBlack(appearance.successColor)) {
      updates["appearance.successColor"] =
        DEFAULT_SETTINGS.appearance.successColor;
      changes.push(
        `Success: ${appearance.successColor ?? "(not set)"} → ${
          DEFAULT_SETTINGS.appearance.successColor
        }`
      );
    }

    if (!appearance.warningColor || isNearBlack(appearance.warningColor)) {
      updates["appearance.warningColor"] =
        DEFAULT_SETTINGS.appearance.warningColor;
      changes.push(
        `Warning: ${appearance.warningColor ?? "(not set)"} → ${
          DEFAULT_SETTINGS.appearance.warningColor
        }`
      );
    }

    if (!appearance.errorColor || isNearBlack(appearance.errorColor)) {
      updates["appearance.errorColor"] = DEFAULT_SETTINGS.appearance.errorColor;
      changes.push(
        `Error: ${appearance.errorColor ?? "(not set)"} → ${
          DEFAULT_SETTINGS.appearance.errorColor
        }`
      );
    }

    if (!appearance.infoColor) {
      updates["appearance.infoColor"] = DEFAULT_SETTINGS.appearance.infoColor!;
      changes.push(
        `Info: ${appearance.infoColor ?? "(not set)"} → ${
          DEFAULT_SETTINGS.appearance.infoColor
        }`
      );
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        success: true,
        message: "All colors are already set correctly",
        changes: [],
      });
    }

    // Apply updates
    const result = await settingsCollection.updateOne(
      { _id: settings._id },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
          updatedBy: user.id,
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Successfully updated appearance colors",
      changes,
      result: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (message.startsWith("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[fix-colors] Error fixing appearance colors:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fix colors" },
      { status: 500 }
    );
  }
}
