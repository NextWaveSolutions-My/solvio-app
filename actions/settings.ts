"use server";

import { getCollection } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  SystemSettings,
  SettingsFormData,
  DEFAULT_SETTINGS,
} from "@/types/settings";
import { ApiResponse } from "@/types";
import { uploadFile, deleteFile } from "@/lib/storage";
import { requirePermissionOrThrow } from "@/lib/auth-utils";
import {
  sendDiscordTestNotification,
  sendSlackTestNotification,
} from "@/lib/ticket-integrations";

/**
 * Require admin role for settings access
 */
async function requireSettingsView() {
  const session = await requirePermissionOrThrow(["settings.view", "settings.manage"], {
    any: true,
    message: "Forbidden - Settings access required",
  });
  return session.user as any;
}

async function requireSettingsManage() {
  const session = await requirePermissionOrThrow("settings.manage", {
    message: "Forbidden - Settings manage access required",
  });
  return session.user as any;
}

function revalidateSettingsConsumers() {
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/support-agent", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/docs", "layout");
  revalidatePath("/admin/settings");
}

/**
 * Get system settings
 */
export async function getSettings(): Promise<ApiResponse<SystemSettings>> {
  try {
    await requireSettingsView();

    const settingsCollection = await getCollection<SystemSettings>("settings");

    // Get settings from database
    let settings = await settingsCollection.findOne({});

    // If no settings exist, create default settings
    if (!settings) {
      const defaultSettings = {
        ...DEFAULT_SETTINGS,
        updatedAt: new Date(),
        updatedBy: "system",
      };

      const result = await settingsCollection.insertOne(defaultSettings as any);
      settings = {
        ...defaultSettings,
        _id: result.insertedId,
      } as SystemSettings;
    }

    // Serialize the settings to plain objects (convert ObjectId and Date to strings)
    const serializedSettings = JSON.parse(JSON.stringify(settings));

    return {
      success: true,
      data: serializedSettings,
    };
  } catch (error: any) {
    console.error("Get settings error:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch settings",
    };
  }
}

/**
 * Update system settings
 */
export async function updateSettings(
  data: SettingsFormData
): Promise<ApiResponse<SystemSettings>> {
  try {
    const user = await requireSettingsManage();

    const settingsCollection = await getCollection<SystemSettings>("settings");

    // Get current settings
    const currentSettings = await settingsCollection.findOne({});

    if (!currentSettings) {
      throw new Error("Settings not found. Please refresh the page.");
    }

    // Merge updates with current settings
    const updatedSettings = {
      ...currentSettings,
      general: {
        ...(currentSettings.general ?? DEFAULT_SETTINGS.general),
        ...data.general,
      },
      tickets: {
        ...(currentSettings.tickets ?? DEFAULT_SETTINGS.tickets),
        ...data.tickets,
      },
      email: {
        ...(currentSettings.email ?? DEFAULT_SETTINGS.email),
        ...data.email,
      },
      fileUploads: {
        ...(currentSettings.fileUploads ?? DEFAULT_SETTINGS.fileUploads),
        ...data.fileUploads,
      },
      security: {
        ...(currentSettings.security ?? DEFAULT_SETTINGS.security),
        ...data.security,
      },
      rateLimiting: {
        ...(currentSettings.rateLimiting ?? DEFAULT_SETTINGS.rateLimiting),
        ...data.rateLimiting,
      },
      appearance: {
        ...(currentSettings.appearance ?? DEFAULT_SETTINGS.appearance),
        ...data.appearance,
      },
      integrations: {
        envato: {
          ...(currentSettings.integrations?.envato ??
            DEFAULT_SETTINGS.integrations.envato),
          ...data.integrations?.envato,
        },
        slack: {
          ...(currentSettings.integrations?.slack ??
            DEFAULT_SETTINGS.integrations.slack),
          ...data.integrations?.slack,
        },
        discord: {
          ...(currentSettings.integrations?.discord ??
            DEFAULT_SETTINGS.integrations.discord),
          ...data.integrations?.discord,
        },
        whatsapp: {
          ...(currentSettings.integrations?.whatsapp ??
            DEFAULT_SETTINGS.integrations.whatsapp),
          ...data.integrations?.whatsapp,
        },
      },
      announcements: {
        ...(currentSettings.announcements ?? DEFAULT_SETTINGS.announcements),
        ...data.announcements,
        showOn: {
          ...(currentSettings.announcements?.showOn ??
            DEFAULT_SETTINGS.announcements.showOn),
          ...data.announcements?.showOn,
        },
      },
      maintenance: {
        ...(currentSettings.maintenance ?? DEFAULT_SETTINGS.maintenance),
        ...data.maintenance,
      },
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    // Update in database
    await settingsCollection.updateOne(
      { _id: currentSettings._id },
      { $set: updatedSettings }
    );

    revalidateSettingsConsumers();

    // Serialize the settings to plain objects
    const serializedSettings = JSON.parse(JSON.stringify(updatedSettings));

    return {
      success: true,
      data: serializedSettings,
    };
  } catch (error: any) {
    console.error("Update settings error:", error);
    return {
      success: false,
      error: error.message || "Failed to update settings",
    };
  }
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<ApiResponse<SystemSettings>> {
  try {
    const user = await requireSettingsManage();

    const settingsCollection = await getCollection<SystemSettings>("settings");

    const currentSettings = await settingsCollection.findOne({});

    if (!currentSettings) {
      throw new Error("Settings not found");
    }

    const resetSettings = {
      ...DEFAULT_SETTINGS,
      _id: currentSettings._id,
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    await settingsCollection.replaceOne(
      { _id: currentSettings._id },
      resetSettings as any
    );

    revalidateSettingsConsumers();

    // Serialize the settings to plain objects
    const serializedSettings = JSON.parse(JSON.stringify(resetSettings));

    return {
      success: true,
      data: serializedSettings,
    };
  } catch (error: any) {
    console.error("Reset settings error:", error);
    return {
      success: false,
      error: error.message || "Failed to reset settings",
    };
  }
}

/**
 * Get public settings (non-sensitive settings for client-side use)
 */
export async function getPublicSettings() {
  try {
    const settingsCollection = await getCollection<SystemSettings>("settings");
    const settings = await settingsCollection.findOne({});

    if (!settings) {
      return {
        success: true,
        data: {
          general: DEFAULT_SETTINGS.general,
          appearance: DEFAULT_SETTINGS.appearance,
          fileUploads: {
            enabled: DEFAULT_SETTINGS.fileUploads.enabled,
            maxFileSize: DEFAULT_SETTINGS.fileUploads.maxFileSize,
            maxFilesPerTicket: DEFAULT_SETTINGS.fileUploads.maxFilesPerTicket,
            allowedFileTypes: DEFAULT_SETTINGS.fileUploads.allowedFileTypes,
          },
          whatsapp: DEFAULT_SETTINGS.integrations.whatsapp,
          announcements: DEFAULT_SETTINGS.announcements,
          maintenance: DEFAULT_SETTINGS.maintenance,
        },
      };
    }

    const fileUploads = settings.fileUploads ?? DEFAULT_SETTINGS.fileUploads;

    return {
      success: true,
      data: {
        general: settings.general ?? DEFAULT_SETTINGS.general,
        appearance: settings.appearance ?? DEFAULT_SETTINGS.appearance,
        fileUploads: {
          enabled: fileUploads.enabled ?? DEFAULT_SETTINGS.fileUploads.enabled,
          maxFileSize:
            fileUploads.maxFileSize ?? DEFAULT_SETTINGS.fileUploads.maxFileSize,
          maxFilesPerTicket:
            fileUploads.maxFilesPerTicket ??
            DEFAULT_SETTINGS.fileUploads.maxFilesPerTicket,
          allowedFileTypes:
            fileUploads.allowedFileTypes ??
            DEFAULT_SETTINGS.fileUploads.allowedFileTypes,
        },
        whatsapp:
          settings.integrations?.whatsapp ??
          DEFAULT_SETTINGS.integrations.whatsapp,
        announcements: settings.announcements ?? DEFAULT_SETTINGS.announcements,
        maintenance: settings.maintenance ?? DEFAULT_SETTINGS.maintenance,
      },
    };
  } catch (error: any) {
    console.error("Get public settings error:", error);
    return {
      success: false,
      error: error.message || "Failed to fetch public settings",
    };
  }
}

/**
 * Test email configuration
 */
export async function testEmailSettings(): Promise<
  ApiResponse<{ messageId: string }>
> {
  try {
    await requireSettingsManage();

    const settingsCollection = await getCollection<SystemSettings>("settings");
    const settings = await settingsCollection.findOne({});

    if (!settings?.email?.enabled) {
      throw new Error("Email notifications are disabled");
    }

    const adminEmail = settings.email?.adminNotificationEmail;

    if (!adminEmail) {
      throw new Error("Admin notification email is not configured");
    }

    const { sendEmail } = await import("@/lib/email");

    const result = await sendEmail({
      to: adminEmail,
      subject: "Test Email - Support System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Configuration Test</h2>
          <p>This is a test email from your support ticket system.</p>
          <p>If you're receiving this, your email configuration is working correctly!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            Sent at: ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    if (!result.success) {
      throw new Error("Failed to send test email");
    }

    return {
      success: true,
      data: { messageId: result.messageId || "test" },
    };
  } catch (error: any) {
    console.error("Test email error:", error);
    return {
      success: false,
      error: error.message || "Failed to send test email",
    };
  }
}

/**
 * Test Slack integration
 */
export async function testSlackIntegration(): Promise<
  ApiResponse<{ success: boolean }>
> {
  try {
    await requireSettingsManage();

    const settingsCollection = await getCollection<SystemSettings>("settings");
    const settings = await settingsCollection.findOne({});

    const slackSettings = settings?.integrations?.slack;

    if (!slackSettings?.enabled || !slackSettings.webhookUrl) {
      throw new Error("Slack integration is not configured");
    }

    await sendSlackTestNotification(slackSettings.webhookUrl);

    return {
      success: true,
      data: { success: true },
    };
  } catch (error: any) {
    console.error("Test Slack error:", error);
    return {
      success: false,
      error: error.message || "Failed to test Slack integration",
    };
  }
}

export async function testDiscordIntegration(): Promise<
  ApiResponse<{ success: boolean }>
> {
  try {
    await requireSettingsManage();

    const settingsCollection = await getCollection<SystemSettings>("settings");
    const settings = await settingsCollection.findOne({});

    const discordSettings = settings?.integrations?.discord;

    if (!discordSettings?.enabled || !discordSettings.webhookUrl) {
      throw new Error("Discord integration is not configured");
    }

    await sendDiscordTestNotification(discordSettings.webhookUrl);

    return {
      success: true,
      data: { success: true },
    };
  } catch (error: any) {
    console.error("Test Discord error:", error);
    return {
      success: false,
      error: error.message || "Failed to test Discord integration",
    };
  }
}

/**
 * Upload logo file
 */
export async function uploadLogo(
  formData: FormData
): Promise<ApiResponse<{ url: string; storageKey: string }>> {
  try {
    const user = await requireSettingsManage();

    const file = formData.get("file") as File;
    if (!file) {
      return {
        success: false,
        error: "No file provided",
      };
    }

    // Validate file type (only images)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error:
          "Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP, SVG)",
      };
    }

    // Validate file size (max 5MB for logos)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File size exceeds 5MB limit",
      };
    }

    const settingsCollection = await getCollection<SystemSettings>("settings");
    const currentSettings = await settingsCollection.findOne({});

    if (!currentSettings) {
      throw new Error("Settings not found");
    }

    // Delete old logo if exists
    if (currentSettings.appearance?.logoStorageKey) {
      try {
        await deleteFile(currentSettings.appearance.logoStorageKey);
      } catch (error) {
        console.error("Error deleting old logo:", error);
        // Continue even if deletion fails
      }
    }

    // Upload new logo
    const uploadedFile = await uploadFile({
      file,
      folder: "branding/logos",
      userId: user.id,
      allowedTypes,
      maxFileSize: maxSize,
    });

    // Update settings with new logo URL and storage key
    await settingsCollection.updateOne(
      { _id: currentSettings._id },
      {
        $set: {
          "appearance.logoUrl": uploadedFile.url,
          "appearance.logoStorageKey": uploadedFile.key,
          updatedAt: new Date(),
          updatedBy: user.id,
        },
      }
    );

    revalidateSettingsConsumers();

    return {
      success: true,
      data: {
        url: uploadedFile.url,
        storageKey: uploadedFile.key,
      },
    };
  } catch (error: any) {
    console.error("Upload logo error:", error);
    return {
      success: false,
      error: error.message || "Failed to upload logo",
    };
  }
}

/**
 * Upload favicon file
 */
export async function uploadFavicon(
  formData: FormData
): Promise<ApiResponse<{ url: string; storageKey: string }>> {
  try {
    const user = await requireSettingsManage();

    const file = formData.get("file") as File;
    if (!file) {
      return {
        success: false,
        error: "No file provided",
      };
    }

    // Validate file type (only images and .ico)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/x-icon",
      "image/vnd.microsoft.icon",
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: "Invalid file type. Only ICO, PNG, or JPEG files are allowed",
      };
    }

    // Validate file size (max 1MB for favicons)
    const maxSize = 1 * 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File size exceeds 1MB limit",
      };
    }

    const settingsCollection = await getCollection<SystemSettings>("settings");
    const currentSettings = await settingsCollection.findOne({});

    if (!currentSettings) {
      throw new Error("Settings not found");
    }

    // Delete old favicon if exists
    if (currentSettings.appearance?.faviconStorageKey) {
      try {
        await deleteFile(currentSettings.appearance.faviconStorageKey);
      } catch (error) {
        console.error("Error deleting old favicon:", error);
        // Continue even if deletion fails
      }
    }

    // Upload new favicon
    const uploadedFile = await uploadFile({
      file,
      folder: "branding/favicons",
      userId: user.id,
      allowedTypes,
      maxFileSize: maxSize,
    });

    // Update settings with new favicon URL and storage key
    await settingsCollection.updateOne(
      { _id: currentSettings._id },
      {
        $set: {
          "appearance.faviconUrl": uploadedFile.url,
          "appearance.faviconStorageKey": uploadedFile.key,
          updatedAt: new Date(),
          updatedBy: user.id,
        },
      }
    );

    revalidateSettingsConsumers();

    return {
      success: true,
      data: {
        url: uploadedFile.url,
        storageKey: uploadedFile.key,
      },
    };
  } catch (error: any) {
    console.error("Upload favicon error:", error);
    return {
      success: false,
      error: error.message || "Failed to upload favicon",
    };
  }
}

/**
 * Upload dark mode logo file
 */
export async function uploadLogoDark(
  formData: FormData
): Promise<ApiResponse<{ url: string; storageKey: string }>> {
  try {
    const user = await requireSettingsManage();

    const file = formData.get("file") as File;
    if (!file) {
      return {
        success: false,
        error: "No file provided",
      };
    }

    // Validate file type (only images)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error:
          "Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP, SVG)",
      };
    }

    // Validate file size (max 5MB for logos)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        success: false,
        error: "File size exceeds 5MB limit",
      };
    }

    const settingsCollection = await getCollection<SystemSettings>("settings");
    const currentSettings = await settingsCollection.findOne({});

    if (!currentSettings) {
      throw new Error("Settings not found");
    }

    // Delete old dark mode logo if exists
    if (currentSettings.appearance?.logoDarkStorageKey) {
      try {
        await deleteFile(currentSettings.appearance.logoDarkStorageKey);
      } catch (error) {
        console.error("Error deleting old dark mode logo:", error);
        // Continue even if deletion fails
      }
    }

    // Upload new dark mode logo
    const uploadedFile = await uploadFile({
      file,
      folder: "branding/logos",
      userId: user.id,
      allowedTypes,
      maxFileSize: maxSize,
    });

    // Update settings with new dark mode logo URL and storage key
    await settingsCollection.updateOne(
      { _id: currentSettings._id },
      {
        $set: {
          "appearance.logoDarkUrl": uploadedFile.url,
          "appearance.logoDarkStorageKey": uploadedFile.key,
          updatedAt: new Date(),
          updatedBy: user.id,
        },
      }
    );

    revalidateSettingsConsumers();

    return {
      success: true,
      data: {
        url: uploadedFile.url,
        storageKey: uploadedFile.key,
      },
    };
  } catch (error: any) {
    console.error("Upload dark mode logo error:", error);
    return {
      success: false,
      error: error.message || "Failed to upload dark mode logo",
    };
  }
}

/**
 * Delete logo
 */
export async function deleteLogo(): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const user = await requireSettingsManage();

    const settingsCollection = await getCollection<SystemSettings>("settings");
    const currentSettings = await settingsCollection.findOne({});

    if (!currentSettings) {
      throw new Error("Settings not found");
    }

    // Delete logo file from storage if exists
    if (currentSettings.appearance?.logoStorageKey) {
      try {
        await deleteFile(currentSettings.appearance.logoStorageKey);
      } catch (error) {
        console.error("Error deleting logo file:", error);
        // Continue even if deletion fails
      }
    }

    // Update settings to remove logo
    await settingsCollection.updateOne(
      { _id: currentSettings._id },
      {
        $set: {
          "appearance.logoUrl": undefined,
          "appearance.logoStorageKey": undefined,
          updatedAt: new Date(),
          updatedBy: user.id,
        },
      }
    );

    revalidateSettingsConsumers();

    return {
      success: true,
      data: { success: true },
    };
  } catch (error: any) {
    console.error("Delete logo error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete logo",
    };
  }
}

/**
 * Delete dark mode logo
 */
export async function deleteLogoDark(): Promise<
  ApiResponse<{ success: boolean }>
> {
  try {
    const user = await requireSettingsManage();

    const settingsCollection = await getCollection<SystemSettings>("settings");
    const currentSettings = await settingsCollection.findOne({});

    if (!currentSettings) {
      throw new Error("Settings not found");
    }

    // Delete dark mode logo file from storage if exists
    if (currentSettings.appearance?.logoDarkStorageKey) {
      try {
        await deleteFile(currentSettings.appearance.logoDarkStorageKey);
      } catch (error) {
        console.error("Error deleting dark mode logo file:", error);
        // Continue even if deletion fails
      }
    }

    // Update settings to remove dark mode logo
    await settingsCollection.updateOne(
      { _id: currentSettings._id },
      {
        $set: {
          "appearance.logoDarkUrl": undefined,
          "appearance.logoDarkStorageKey": undefined,
          updatedAt: new Date(),
          updatedBy: user.id,
        },
      }
    );

    revalidateSettingsConsumers();

    return {
      success: true,
      data: { success: true },
    };
  } catch (error: any) {
    console.error("Delete dark mode logo error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete dark mode logo",
    };
  }
}
