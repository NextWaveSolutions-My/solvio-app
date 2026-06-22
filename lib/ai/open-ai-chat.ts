/**
 * Lightweight cross-component signal to open the AI chat widget.
 *
 * The AI chat window lives inside the globally-mounted FloatingChatButton.
 * Any client component (e.g. the docs "Ask AI" button) can request it to open
 * by dispatching this event, instead of duplicating the chat instance.
 */
export const AI_CHAT_OPEN_EVENT = "solvio:open-ai-chat";

/** Ask the globally-mounted chat widget to open its AI chat window. */
export function requestOpenAiChat(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AI_CHAT_OPEN_EVENT));
  }
}
