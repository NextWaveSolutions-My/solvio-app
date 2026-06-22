/**
 * Envato API Integration
 * 
 * This module provides functions to interact with the Envato API
 * for purchase code verification and validation.
 * 
 * API Documentation: https://build.envato.com/api/
 */

import { getCollection } from "@/lib/db";
import type { SystemSettings } from "@/types/settings";
import type { PurchaseVerification } from "@/types";

// =============================================================================
// TYPES
// =============================================================================

interface EnvatoApiResponse {
  buyer: string;
  licence: string;
  item: {
    id: number;
    name: string;
  };
  sold_at: string;
  supported_until: string | null;
  purchase_count: number;
}

interface EnvatoErrorResponse {
  error: string;
  description?: string;
}

// =============================================================================
// ENVATO API CLIENT
// =============================================================================

/**
 * Get Envato settings from database
 */
async function getEnvatoSettings(): Promise<{
  enabled: boolean;
  apiToken?: string;
  username?: string;
}> {
  try {
    const settingsCollection = await getCollection<SystemSettings>("settings");
    const settings = await settingsCollection.findOne({});

    if (!settings) {
      return { enabled: false };
    }

    return {
      enabled: settings.integrations?.envato?.enabled || false,
      apiToken: settings.integrations?.envato?.apiToken,
      username: settings.integrations?.envato?.username,
    };
  } catch (error) {
    console.error("Failed to fetch Envato settings:", error);
    return { enabled: false };
  }
}

/**
 * Verify a purchase code with the Envato API
 * 
 * @param purchaseCode - The purchase code to verify
 * @returns Purchase verification data or null if invalid
 */
export async function verifyPurchaseCode(
  purchaseCode: string
): Promise<{ success: boolean; data?: PurchaseVerification; error?: string }> {
  try {
    // Get Envato settings from database
    const envatoSettings = await getEnvatoSettings();

    if (!envatoSettings.enabled) {
      return {
        success: false,
        error: "Envato integration is not enabled",
      };
    }

    if (!envatoSettings.apiToken) {
      return {
        success: false,
        error: "Envato API token is not configured",
      };
    }

    // Validate purchase code format (Envato codes are typically UUID format)
    const purchaseCodeRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (!purchaseCodeRegex.test(purchaseCode)) {
      return {
        success: false,
        error: "Invalid purchase code format. Please enter a valid Envato purchase code.",
      };
    }

    // Call Envato API
    const response = await fetch(
      `https://api.envato.com/v3/market/author/sale?code=${purchaseCode}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${envatoSettings.apiToken}`,
          "User-Agent": "Purchase Code Verification",
        },
      }
    );

    // Handle API errors
    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: "Invalid purchase code. This code was not found in our records.",
        };
      }

      if (response.status === 401) {
        return {
          success: false,
          error: "Envato API authentication failed. Please contact support.",
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: "Access denied. The API token may not have the required permissions.",
        };
      }

      const errorData: EnvatoErrorResponse = await response.json().catch(() => ({
        error: "Unknown error",
      }));

      return {
        success: false,
        error: errorData.description || errorData.error || "Failed to verify purchase code",
      };
    }

    // Parse successful response
    const data: EnvatoApiResponse = await response.json();

    // Check if purchase code has already been used
    const ticketsCollection = await getCollection("tickets");
    const existingTicket = await ticketsCollection.findOne({
      purchaseCode: purchaseCode,
    });

    if (existingTicket) {
      return {
        success: false,
        error: "This purchase code has already been used to create a support ticket.",
      };
    }

    // Build verification data
    const verification: PurchaseVerification = {
      verified: true,
      purchaseCode: purchaseCode,
      buyer: data.buyer,
      purchaseDate: new Date(data.sold_at),
      supportedUntil: data.supported_until ? new Date(data.supported_until) : undefined,
      itemId: data.item.id.toString(),
      itemName: data.item.name,
      licenseType: data.licence,
      verifiedAt: new Date(),
    };

    return {
      success: true,
      data: verification,
    };
  } catch (error) {
    console.error("Envato API error:", error);

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Network error. Please check your internet connection and try again.",
      };
    }

    return {
      success: false,
      error: "An unexpected error occurred while verifying the purchase code. Please try again.",
    };
  }
}

/**
 * Check if purchase code verification is required
 * 
 * @returns True if purchase code verification is enabled in settings
 */
export async function isPurchaseCodeRequired(): Promise<boolean> {
  try {
    const settingsCollection = await getCollection<SystemSettings>("settings");
    const settings = await settingsCollection.findOne({});

    if (!settings) {
      return false;
    }

    // Purchase code is required if both Envato integration is enabled
    // AND the "require purchase code" setting is enabled
    const envatoEnabled = settings.integrations?.envato?.enabled || false;
    const requirePurchaseCode = settings.tickets?.requirePurchaseCode || false;

    return envatoEnabled && requirePurchaseCode;
  } catch (error) {
    console.error("Failed to check purchase code requirement:", error);
    return false;
  }
}

/**
 * Get public Envato settings (for client-side use)
 * 
 * @returns Public Envato settings (no sensitive data)
 */
export async function getPublicEnvatoSettings(): Promise<{
  enabled: boolean;
  requirePurchaseCode: boolean;
}> {
  try {
    const settingsCollection = await getCollection<SystemSettings>("settings");
    const settings = await settingsCollection.findOne({});

    if (!settings) {
      return {
        enabled: false,
        requirePurchaseCode: false,
      };
    }

    return {
      enabled: settings.integrations?.envato?.enabled || false,
      requirePurchaseCode: settings.tickets?.requirePurchaseCode || false,
    };
  } catch (error) {
    console.error("Failed to fetch public Envato settings:", error);
    return {
      enabled: false,
      requirePurchaseCode: false,
    };
  }
}

/**
 * Check if support is still active for a purchase
 * 
 * @param supportedUntil - The date until which support is active
 * @returns True if support is still active
 */
export function isSupportActive(supportedUntil?: Date): boolean {
  if (!supportedUntil) {
    return false;
  }

  return new Date() <= supportedUntil;
}

/**
 * Format purchase verification for display
 * 
 * @param verification - Purchase verification data
 * @returns Formatted string for display
 */
export function formatPurchaseVerification(verification: PurchaseVerification): string {
  const parts = [
    `Buyer: ${verification.buyer}`,
    `Item: ${verification.itemName || "Unknown"}`,
    `License: ${verification.licenseType || "Unknown"}`,
    `Purchased: ${verification.purchaseDate.toLocaleDateString()}`,
  ];

  if (verification.supportedUntil) {
    const supportActive = isSupportActive(verification.supportedUntil);
    parts.push(
      `Support: ${supportActive ? "Active" : "Expired"} (until ${verification.supportedUntil.toLocaleDateString()})`
    );
  }

  return parts.join(" | ");
}

