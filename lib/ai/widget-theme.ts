/**
 * Shared color logic for the public chat widget. Used by both the live widget
 * (chat-window) and the admin live preview so they stay pixel-identical.
 */

/** Brand fallbacks used when the admin hasn't set custom colors. */
export const DEFAULT_WIDGET_PRIMARY = "#2563eb";
export const DEFAULT_WIDGET_ACCENT = "#7c3aed";

/** Expanded embed iframe dimensions, in pixels. */
export const DEFAULT_WIDGET_WIDTH = 404;
export const DEFAULT_WIDGET_HEIGHT = 680;
export const MIN_WIDGET_WIDTH = 320;
export const MAX_WIDGET_WIDTH = 640;
export const MIN_WIDGET_HEIGHT = 420;
export const MAX_WIDGET_HEIGHT = 900;

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function sanitizeHex(value: string | undefined | null): string {
  if (!value) return "";
  const v = value.trim();
  return HEX_RE.test(v) ? v : "";
}

export interface WidgetTheme {
  primary: string;
  accent: string;
  /** Diagonal header gradient. */
  headerGradient: string;
  /** Solid accent for the circular send button (high contrast with white). */
  sendButton: string;
  /** Text/icon color that reads well on top of the gradient. */
  onPrimary: string;
}

export function resolveWidgetTheme(
  primaryColor?: string,
  accentColor?: string
): WidgetTheme {
  const primary = sanitizeHex(primaryColor) || DEFAULT_WIDGET_PRIMARY;
  const accent = sanitizeHex(accentColor) || primary;
  return {
    primary,
    accent,
    headerGradient: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`,
    sendButton: accent,
    onPrimary: "#ffffff",
  };
}
