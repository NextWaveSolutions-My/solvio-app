"use server";

import { requireAuth } from "@/lib/auth-utils";
import {
  verifyPurchaseCode,
  isPurchaseCodeRequired,
  getPublicEnvatoSettings,
} from "@/lib/envato";
import type { ApiResponse, PurchaseVerification } from "@/types";

/**
 * Verify a purchase code (server action)
 * 
 * This action is called from the client to verify a purchase code
 * before creating a ticket.
 * 
 * @param purchaseCode - The purchase code to verify
 * @returns Verification result with purchase data
 */
export async function verifyPurchaseCodeAction(
  purchaseCode: string
): Promise<ApiResponse<PurchaseVerification>> {
  try {
    // Require authentication
    await requireAuth();

    // Validate input
    if (!purchaseCode || typeof purchaseCode !== "string") {
      return {
        success: false,
        error: "Purchase code is required",
      };
    }

    // Trim and validate
    const trimmedCode = purchaseCode.trim();
    if (trimmedCode.length === 0) {
      return {
        success: false,
        error: "Purchase code cannot be empty",
      };
    }

    // Verify with Envato API
    const result = await verifyPurchaseCode(trimmedCode);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to verify purchase code",
      };
    }

    return {
      success: true,
      data: result.data,
      message: "Purchase code verified successfully",
    };
  } catch (error) {
    console.error("Purchase code verification error:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    };
  }
}

/**
 * Check if purchase code is required (server action)
 * 
 * This action is called from the client to determine if the
 * purchase code field should be shown and required.
 * 
 * @returns True if purchase code is required
 */
export async function checkPurchaseCodeRequired(): Promise<ApiResponse<boolean>> {
  try {
    const required = await isPurchaseCodeRequired();

    return {
      success: true,
      data: required,
    };
  } catch (error) {
    console.error("Failed to check purchase code requirement:", error);
    return {
      success: true,
      data: false, // Default to not required on error
    };
  }
}

/**
 * Get public Envato settings (server action)
 * 
 * This action returns non-sensitive Envato settings that can be
 * used on the client side to determine UI behavior.
 * 
 * @returns Public Envato settings
 */
export async function getEnvatoSettingsAction(): Promise<
  ApiResponse<{
    enabled: boolean;
    requirePurchaseCode: boolean;
  }>
> {
  try {
    const settings = await getPublicEnvatoSettings();

    return {
      success: true,
      data: settings,
    };
  } catch (error) {
    console.error("Failed to fetch Envato settings:", error);
    return {
      success: true,
      data: {
        enabled: false,
        requirePurchaseCode: false,
      },
    };
  }
}

