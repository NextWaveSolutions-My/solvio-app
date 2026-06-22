import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

import { getPublicSystemSettings } from "@/lib/settings-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getInitials(siteName: string) {
  const initials = siteName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "SA";
}

function getIconSize(rawSize: string) {
  const parsed = Number.parseInt(rawSize, 10);
  if (Number.isNaN(parsed)) {
    return 192;
  }

  return Math.min(512, Math.max(128, parsed));
}

export async function GET(
  _request: NextRequest,
  context: {
    params:
      | Promise<{
          size: string;
        }>
      | {
          size: string;
        };
  }
) {
  const { size: rawSize } = await context.params;
  const size = getIconSize(rawSize);
  const settings = await getPublicSystemSettings();
  const siteName = settings.general.siteName || "Support App";
  const initials = getInitials(siteName);
  const primaryColor = settings.appearance.primaryColor || "#3b82f6";
  const secondaryColor = settings.appearance.secondaryColor || "#0f172a";
  const accentColor = settings.appearance.accentColor || "#10b981";
  const fontSize = Math.round(size * 0.34);
  const shadowOffset = Math.max(10, Math.round(size * 0.04));
  const borderRadius = Math.round(size * 0.24);

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: `linear-gradient(135deg, ${secondaryColor} 0%, ${primaryColor} 60%, ${accentColor} 100%)`,
          display: "flex",
          height: "100%",
          justifyContent: "center",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius,
            boxShadow: `0 ${shadowOffset}px ${shadowOffset * 2}px rgba(15, 23, 42, 0.28)`,
            color: "#ffffff",
            display: "flex",
            fontSize,
            fontWeight: 700,
            height: "74%",
            letterSpacing: "-0.08em",
            lineHeight: 1,
            alignItems: "center",
            justifyContent: "center",
            textTransform: "uppercase",
            width: "74%",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 100%)",
            backdropFilter: "blur(16px)",
          }}
        >
          {initials}
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
    }
  );
}
