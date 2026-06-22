/**
 * Telegram Admin Notifications
 *
 * Posts ticket / comment / message activity to a single shared admin Telegram
 * group. Admins join the group; the bot posts every event there. This is a
 * fire-and-forget, send-only integration — there is no inbound bot, no per-user
 * linking, and no database. Configure with two env vars:
 *
 *   TELEGRAM_BOT_TOKEN     — from @BotFather
 *   TELEGRAM_ADMIN_CHAT_ID — the group chat id the bot posts to
 */

export function isTelegramAdminConfigured() {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID
  );
}

/**
 * Turn rich-text / HTML body content into a clean single-block preview: strip
 * tags, collapse whitespace, and truncate so long bodies don't flood the chat.
 * Returns "" for empty/attachment-only content.
 */
export function toPlainPreview(content: string | null | undefined, max = 500) {
  const text = (content ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** Escape the small set of characters Telegram's HTML parse mode reserves. */
function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Post an admin notification to the shared Telegram group.
 *
 * Always fire-and-forget: never throw, never block the caller. If Telegram is
 * not configured, this is a no-op so the app runs fine without it.
 */
export async function notifyAdminsTelegram(params: {
  title: string;
  body: string;
  /** Relative app path (e.g. "/admin/tickets/123"); turned into a full link. */
  url?: string;
}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chatId) return;

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
    const link = params.url ? `${base}${params.url}` : undefined;

    const text =
      `<b>${escapeHtml(params.title)}</b>\n` +
      `${escapeHtml(params.body)}` +
      (link ? `\n\n<a href="${escapeHtml(link)}">Open in dashboard</a>` : "");

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    if (!res.ok) {
      console.error(
        "[Telegram] sendMessage failed:",
        res.status,
        await res.text().catch(() => "")
      );
    }
  } catch (error) {
    console.error("[Telegram] Failed to notify admins:", error);
  }
}
