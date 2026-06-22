import { getCollection } from "@/lib/db";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";

/**
 * Get system settings (cached for performance)
 * This is a server-side only function
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const settingsCollection = await getCollection<SystemSettings>("settings");
    const settings = await settingsCollection.findOne({});

    if (!settings) {
      // Return default settings if none exist
      return {
        ...DEFAULT_SETTINGS,
        _id: null as unknown as SystemSettings["_id"],
        updatedAt: new Date(),
        updatedBy: "system",
      } as SystemSettings;
    }

    return settings;
  } catch (error) {
    console.error("Error fetching system settings:", error);
    // Return default settings on error
    return {
      ...DEFAULT_SETTINGS,
      _id: null as unknown as SystemSettings["_id"],
      updatedAt: new Date(),
      updatedBy: "system",
    } as SystemSettings;
  }
}

/**
 * Get public settings (non-sensitive settings for client-side use)
 * This can be used in both server and client components
 */
export async function getPublicSystemSettings() {
  try {
    const settings = await getSystemSettings();

    return {
      general: settings.general,
      appearance: settings.appearance,
      fileUploads: {
        enabled: settings.fileUploads.enabled,
        maxFileSize: settings.fileUploads.maxFileSize,
        maxFilesPerTicket: settings.fileUploads.maxFilesPerTicket,
        allowedFileTypes: settings.fileUploads.allowedFileTypes,
      },
      whatsapp:
        settings.integrations?.whatsapp ??
        DEFAULT_SETTINGS.integrations.whatsapp,
      announcements: settings.announcements ?? DEFAULT_SETTINGS.announcements,
      maintenance: settings.maintenance ?? DEFAULT_SETTINGS.maintenance,
    };
  } catch (error) {
    console.error("Error fetching public settings:", error);
    return {
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
    };
  }
}

/**
 * Generate CSS variables from appearance settings
 */
export function generateCssVariables(
  appearance: SystemSettings["appearance"]
): string {
  // Only emit variables that have values to preserve CSS fallbacks in globals.css
  const lines: string[] = [];
  const add = (name: string, value?: string) => {
    if (value) lines.push(`--brand-${name}: ${value};`);
  };

  add("primary", appearance.primaryColor);
  add("secondary", appearance.secondaryColor);
  add("accent", appearance.accentColor);
  add("success", appearance.successColor);
  add("warning", appearance.warningColor);
  add("error", appearance.errorColor);
  if ("infoColor" in appearance && appearance.infoColor) add("info", appearance.infoColor);

  return `
    :root {
      ${lines.join("\n      ")}
    }
  `;
}

/**
 * Get metadata for the application
 */
export async function getAppMetadata() {
  const settings = await getSystemSettings();

  return {
    title: settings.general.siteName,
    description: settings.general.siteDescription,
    applicationName: settings.general.siteName,
    keywords: [
      "support",
      "tickets",
      "customer service",
      settings.general.companyName,
    ],
    authors: [{ name: settings.general.companyName }],
    creator: settings.general.companyName,
    publisher: settings.general.companyName,
  };
}

/**
 * Get logo URL or fallback to default
 */
export async function getLogoUrl(): Promise<string | null> {
  const settings = await getSystemSettings();
  return settings.appearance.logoUrl || null;
}

/**
 * Get dark mode logo URL
 */
export async function getLogoDarkUrl(): Promise<string | null> {
  const settings = await getSystemSettings();
  return settings.appearance.logoDarkUrl || null;
}

/**
 * Get both logo URLs (light and dark)
 */
export async function getLogoUrls(): Promise<{
  light: string | null;
  dark: string | null;
}> {
  const settings = await getSystemSettings();
  return {
    light: settings.appearance.logoUrl || null,
    dark: settings.appearance.logoDarkUrl || null,
  };
}

/**
 * Get favicon URL or fallback to default
 */
export async function getFaviconUrl(): Promise<string | null> {
  const settings = await getSystemSettings();
  return settings.appearance.faviconUrl || null;
}

/**
 * Get footer text
 */
export async function getFooterText(): Promise<string> {
  const settings = await getSystemSettings();
  return (
    settings.appearance.footerText ||
    `© ${new Date().getFullYear()} ${
      settings.general.companyName
    }. All rights reserved.`
  );
}

/**
 * Get copyright text
 */
export async function getCopyrightText(): Promise<string> {
  const settings = await getSystemSettings();
  return (
    settings.appearance.copyrightText ||
    `Copyright © ${new Date().getFullYear()} ${settings.general.companyName}`
  );
}

/**
 * Format date according to system settings
 */
export async function formatDate(
  date: Date | string | number | null | undefined
): Promise<string> {
  const parsedDate =
    date instanceof Date ? date : date != null ? new Date(date) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  const settings = await getSystemSettings();
  const { dateFormat, timeFormat, timezone } = settings.general;

  const tz = timezone || "UTC";

  const numericFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
    timeZone: tz,
  });

  const textMonthFormatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === "12h",
    timeZone: tz,
  });

  const numParts = numericFormatter.formatToParts(parsedDate);
  const textParts = textMonthFormatter.formatToParts(parsedDate);

  const getPart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value || "";

  const year = getPart(numParts, "year");
  const monthNum = getPart(numParts, "month");
  const day = getPart(numParts, "day");
  const hour = getPart(numParts, "hour");
  const minute = getPart(numParts, "minute");
  const dayPeriod = getPart(numParts, "dayPeriod");
  const monthText = getPart(textParts, "month");

  let dateStr = "";
  switch (dateFormat) {
    case "MMM dd, yyyy":
      dateStr = `${monthText} ${day}, ${year}`;
      break;
    case "dd/MM/yyyy":
      dateStr = `${day}/${monthNum}/${year}`;
      break;
    case "MM/dd/yyyy":
      dateStr = `${monthNum}/${day}/${year}`;
      break;
    case "yyyy-MM-dd":
      dateStr = `${year}-${monthNum}-${day}`;
      break;
    case "dd MMM yyyy":
      dateStr = `${day} ${monthText} ${year}`;
      break;
    default:
      dateStr = `${monthText} ${day}, ${year}`;
  }

  const timeStr =
    timeFormat === "12h" ? `${hour}:${minute} ${dayPeriod}` : `${hour}:${minute}`;

  return `${dateStr}, ${timeStr}`;
}

/**
 * Get brand colors for use in components
 */
export async function getBrandColors() {
  const settings = await getSystemSettings();
  return {
    primary: settings.appearance.primaryColor,
    secondary: settings.appearance.secondaryColor,
    accent: settings.appearance.accentColor,
    success: settings.appearance.successColor,
    warning: settings.appearance.warningColor,
    error: settings.appearance.errorColor,
    info:
      (settings.appearance as { infoColor?: string }).infoColor ??
      settings.appearance.primaryColor,
  };
}

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(
  feature: keyof SystemSettings
): Promise<boolean> {
  const settings = await getSystemSettings();
  const featureSettings = settings[feature];

  if (typeof featureSettings === "object" && "enabled" in featureSettings) {
    return featureSettings.enabled as boolean;
  }

  return false;
}

/**
 * Get custom CSS if defined
 */
export async function getCustomCss(): Promise<string | null> {
  const settings = await getSystemSettings();
  return settings.appearance.customCss || null;
}
