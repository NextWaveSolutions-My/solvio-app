"use client";

/**
 * Standalone, chrome-free chat widget page.
 *
 * Loaded INSIDE the iframe injected by /public/widget.js on third-party sites.
 * It renders only the launcher bubble + ChatWindow and tells the parent page
 * (via postMessage) what size the iframe should be so the rest of the host
 * page stays clickable when the chat is closed.
 *
 * Single-org with optional site keys: a key scopes answers to one site's
 * knowledge plus Global sources.
 */

import { useCallback, useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { ChatWindow } from "@/components/ai-chat/chat-window";
import { cn } from "@/lib/utils";
import type { AIChatbotPublicConfig } from "@/types";

// Shared with public/widget.js — keep in sync.
const WIDGET_MSG_SOURCE = "solvio-widget";

/** Validate the ?host= param and normalise it to a bare origin. */
function readHostOrigin(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw =
      new URLSearchParams(window.location.search).get("host") ||
      document.referrer;
    if (!raw) return "";
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.origin;
  } catch {
    return "";
  }
}

/** Read the optional per-site embed key from the `?key=` param. */
function readSiteKey(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("key") ?? "";
}

export default function EmbedPage() {
  const [config, setConfig] = useState<AIChatbotPublicConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [hostOrigin, setHostOrigin] = useState("");
  const [siteKey, setSiteKey] = useState("");

  useEffect(() => {
    setHostOrigin(readHostOrigin());
    setSiteKey(readSiteKey());
  }, []);

  // The widget renders inside a same-origin iframe that injects no chrome. When
  // the embedder's OS is in dark mode, next-themes (defaultTheme="system") adds
  // `.dark` to this document and `color-scheme: dark` takes effect, which makes
  // the browser paint a dark viewport canvas *behind* the transparent iframe —
  // showing up as a black box behind the bubble and around the chat window — and
  // also flips `--background` to near-black so the window itself renders dark.
  //
  // Keep the widget consistently light regardless of the host's theme. We mutate
  // only this iframe document's <html> (never localStorage), so the main app's
  // theme in other tabs is untouched. A MutationObserver re-strips `.dark` if
  // next-themes reapplies it on a system-preference change.
  useEffect(() => {
    const root = document.documentElement;
    const forceLight = () => {
      root.classList.remove("dark");
      // `light` (not `normal`) is required: `normal` honours the OS, so a
      // dark-mode machine still gets a dark iframe backdrop behind the
      // transparent body. `light` + the explicit transparent background keeps
      // the iframe see-through.
      root.style.colorScheme = "light";
      root.style.background = "transparent";
      if (document.body) document.body.style.background = "transparent";
    };
    forceLight();
    const observer = new MutationObserver(forceLight);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/chat/config")
      .then((r) => r.json())
      .then((data: AIChatbotPublicConfig) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Tell the parent how big the iframe needs to be. Scope the message to the
  // known host origin; fall back to "*" only when it couldn't be determined.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    window.parent.postMessage(
      {
        source: WIDGET_MSG_SOURCE,
        type: "resize",
        state: open ? "open" : "closed",
        position: config?.position,
        widgetWidth: config?.widgetWidth,
        widgetHeight: config?.widgetHeight,
      },
      hostOrigin || "*"
    );
  }, [config, open, hostOrigin]);

  const handleClose = useCallback(() => setOpen(false), []);

  if (!config?.enabled) return null;

  return (
    <>
      {/* The host page may have any background; keep the iframe see-through
          so only the bubble/window are visible. */}
      <style>{`html,body{background:transparent!important;color-scheme:light!important;margin:0;padding:0;overflow:hidden}`}</style>

      <div
        className={cn(
          "fixed inset-0 flex flex-col justify-end gap-3 p-4",
          config.position === "bottom-left" ? "items-start" : "items-end"
        )}
      >
        {open && (
          <ChatWindow
            config={config}
            onClose={handleClose}
            embedded
            appOrigin={
              typeof window !== "undefined" ? window.location.origin : ""
            }
            // Scope the bot's answers to this site's knowledge (+ global).
            siteKey={siteKey}
            host={hostOrigin}
            // Scope the conversation to the embedding site + key so different
            // host sites (or keys) don't share one history via the same-origin
            // iframe.
            storageNamespace={[hostOrigin, siteKey].filter(Boolean).join("::")}
          />
        )}

        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open chat"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 hover:shadow-xl"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        )}
      </div>
    </>
  );
}
