"use client";

import React, { createContext, useContext, ReactNode, useEffect } from "react";
import { SystemSettings } from "@/types/settings";

interface WhatsAppSettings {
  enabled: boolean;
  phoneNumber?: string;
  defaultMessage?: string;
}

interface PublicSettings {
  general: SystemSettings["general"];
  appearance: SystemSettings["appearance"];
  fileUploads: {
    enabled: boolean;
    maxFileSize: number;
    maxFilesPerTicket: number;
    allowedFileTypes: string[];
  };
  whatsapp: WhatsAppSettings;
  announcements: SystemSettings["announcements"];
  maintenance: SystemSettings["maintenance"];
}

interface SettingsContextType {
  settings: PublicSettings;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

interface SettingsProviderProps {
  children: ReactNode;
  settings: PublicSettings;
}

export function SettingsProvider({
  children,
  settings,
}: SettingsProviderProps) {
  // Apply brand CSS variables on mount and when settings change (live updates after router.refresh)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const a = settings.appearance;
    const set = (k: string, v?: string) => v && root.style.setProperty(k, v);
    set("--brand-primary", a.primaryColor);
    set("--brand-secondary", a.secondaryColor);
    set("--brand-accent", a.accentColor);
    set("--brand-success", a.successColor);
    set("--brand-warning", a.warningColor);
    set("--brand-error", a.errorColor);
    // optional info color; fall back handled in CSS via var(--brand-info, ...)
    if (a.infoColor) set("--brand-info", a.infoColor);
  }, [settings.appearance]);

  return (
    <SettingsContext.Provider value={{ settings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

// Hook to get specific setting values
export function useSetting<K extends keyof PublicSettings>(
  key: K
): PublicSettings[K] {
  const { settings } = useSettings();
  return settings[key];
}

// Hook to get brand colors
export function useBrandColors() {
  const { settings } = useSettings();
  return {
    primary: settings.appearance.primaryColor,
    secondary: settings.appearance.secondaryColor,
    accent: settings.appearance.accentColor,
    success: settings.appearance.successColor,
    warning: settings.appearance.warningColor,
    error: settings.appearance.errorColor,
  };
}

// Hook to get logo URL
export function useLogoUrl() {
  const { settings } = useSettings();
  return settings.appearance.logoUrl || null;
}

// Hook to get dark mode logo URL
export function useLogoDarkUrl() {
  const { settings } = useSettings();
  return settings.appearance.logoDarkUrl || null;
}

// Hook to get both logo URLs
export function useLogoUrls() {
  const { settings } = useSettings();
  return {
    light: settings.appearance.logoUrl || null,
    dark: settings.appearance.logoDarkUrl || null,
  };
}

// Hook to get favicon URL
export function useFaviconUrl() {
  const { settings } = useSettings();
  return settings.appearance.faviconUrl || null;
}

// Hook to get company info
export function useCompanyInfo() {
  const { settings } = useSettings();
  return {
    name: settings.general.companyName,
    siteName: settings.general.siteName,
    siteDescription: settings.general.siteDescription,
    supportEmail: settings.general.supportEmail,
  };
}

// Hook to get WhatsApp settings
export function useWhatsAppSettings(): WhatsAppSettings {
  const { settings } = useSettings();
  return settings.whatsapp;
}

export function useFormatDate(options?: { includeTime?: boolean }) {
  const { settings } = useSettings();
  const includeTime = options?.includeTime ?? true;
  return (date: Date | string | number | null | undefined) => {
    const parsedDate =
      date instanceof Date ? date : date != null ? new Date(date) : null;

    if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

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
    if (!includeTime) return dateStr;
    const timeStr =
      timeFormat === "12h" ? `${hour}:${minute} ${dayPeriod}` : `${hour}:${minute}`;
    return `${dateStr}, ${timeStr}`;
  };
}
