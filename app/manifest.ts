import type { MetadataRoute } from "next";

import { getPublicSystemSettings } from "@/lib/settings-utils";

export const dynamic = "force-dynamic";

function createShortName(siteName: string) {
  return siteName.length > 12 ? siteName.slice(0, 12) : siteName;
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getPublicSystemSettings();
  const siteName = settings.general.siteName || "Support App";
  const description =
    settings.general.siteDescription || "Customer support and ticket management";
  const themeColor = settings.appearance.primaryColor || "#3b82f6";
  const backgroundColor = settings.appearance.secondaryColor || "#ffffff";

  return {
    id: "/",
    name: siteName,
    short_name: createShortName(siteName),
    description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: backgroundColor,
    theme_color: themeColor,
    lang: "en",
    categories: ["business", "productivity", "communication"],
    icons: [
      {
        src: "/pwa-icons/192",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/pwa-icons/512",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/pwa-icons/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Login",
        short_name: "Login",
        url: "/login",
      },
      {
        name: "Messages",
        short_name: "Messages",
        url: "/dashboard/messages",
      },
      {
        name: "Notifications",
        short_name: "Alerts",
        url: "/dashboard/notifications",
      },
    ],
  };
}
