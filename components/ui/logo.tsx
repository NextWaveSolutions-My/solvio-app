"use client";

/* eslint-disable @next/next/no-img-element */

import { useTheme } from "next-themes";
import {
  useCompanyInfo,
  useLogoUrls,
} from "@/components/providers/settings-provider";
import { useSyncExternalStore } from "react";

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
  showFallbackText?: boolean;
  forceDark?: boolean;
  forceLight?: boolean;
}

function subscribe() {
  return () => {};
}

export function Logo({
  width = 120,
  height = 40,
  className = "h-8 w-auto object-contain",
  forceDark,
  forceLight,
  showFallbackText,
}: LogoProps) {
  const { theme, resolvedTheme } = useTheme();
  const logos = useLogoUrls();
  const companyInfo = useCompanyInfo();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    // During SSR/initial mount, if forcing a specific mode, we can try to respect it
    if (forceDark && logos.dark) {
      return (
        <img
          src={logos.dark}
          alt={companyInfo.name}
          width={width}
          height={height}
          className={className}
        />
      );
    }
    // Default fallback
    if (logos.light) {
      return (
        <img
          src={logos.light}
          alt={companyInfo.name}
          width={width}
          height={height}
          className={className}
        />
      );
    }
    if (showFallbackText) {
      return (
        <h1 className="text-lg font-bold text-foreground">
          {companyInfo.siteName}
        </h1>
      );
    }
    return null;
  }

  // Determine which logo to show based on theme
  let isDark = resolvedTheme === "dark" || theme === "dark";

  if (forceDark) isDark = true;
  if (forceLight) isDark = false;

  const logoUrl = isDark && logos.dark ? logos.dark : logos.light;

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={companyInfo.name}
        width={width}
        height={height}
        className={className}
      />
    );
  }

  if (showFallbackText) {
    return (
      <h1 className="text-lg font-bold text-foreground">
        {companyInfo.siteName}
      </h1>
    );
  }

  return null;
}
