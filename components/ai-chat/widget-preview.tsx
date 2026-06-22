"use client";

import { ArrowUp, Sparkles, X } from "lucide-react";
import { resolveWidgetTheme } from "@/lib/ai/widget-theme";

export interface WidgetPreviewProps {
  headerTitle: string;
  welcomeMessage: string;
  placeholder: string;
  footerText: string;
  showPoweredBy: boolean;
  primaryColor: string;
  accentColor: string;
  headerAvatarUrl: string;
  widgetWidth: number;
  widgetHeight: number;
}

/**
 * Static, non-interactive replica of the live chat widget chrome. Shares
 * `resolveWidgetTheme` with the real widget so the admin preview is faithful.
 */
export function WidgetPreview({
  headerTitle,
  welcomeMessage,
  placeholder,
  footerText,
  showPoweredBy,
  primaryColor,
  accentColor,
  headerAvatarUrl,
  widgetWidth,
  widgetHeight,
}: WidgetPreviewProps) {
  const theme = resolveWidgetTheme(primaryColor, accentColor);
  const title = headerTitle.trim() || "Live Chat";

  return (
    <div
      className="flex shrink-0 flex-col overflow-hidden rounded-3xl border border-border/60 bg-background shadow-xl"
      style={{ width: widgetWidth, height: widgetHeight }}
    >
      {/* Header — inset, floating rounded bar */}
      <div className="relative px-3 pt-3">
        <div
          className="flex items-center justify-between rounded-2xl px-4 py-3 text-white"
          style={{ background: theme.headerGradient }}
        >
          <p className="text-base font-semibold leading-tight">{title}</p>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white">
            <X className="h-4 w-4" />
          </span>
        </div>
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-white p-0.5 shadow-md ring-2 ring-white">
            {headerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={headerAvatarUrl}
                alt={title}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center rounded-full text-white"
                style={{ background: theme.headerGradient }}
              >
                <Sparkles className="h-5 w-5" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-hidden bg-background px-4 pb-4 pt-9">
        <div className="flex items-end gap-2">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
            style={{ background: theme.headerGradient }}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm leading-relaxed text-foreground">
            {welcomeMessage || "Hi! How can I help you today?"}
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2 px-4 pb-3 pt-2">
        <div
          className="flex items-center gap-2 rounded-full border-2 py-1.5 pl-4 pr-1.5"
          style={{ borderColor: theme.primary }}
        >
          <span className="flex-1 truncate text-sm text-muted-foreground">
            {placeholder || "Type a message..."}
          </span>
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: theme.sendButton }}
          >
            <ArrowUp className="h-4 w-4" />
          </span>
        </div>
        {showPoweredBy && footerText.trim() && (
          <p className="text-center text-[11px] text-muted-foreground/70">
            {footerText}
          </p>
        )}
      </div>
    </div>
  );
}
