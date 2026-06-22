"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowUp, Loader2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveWidgetTheme } from "@/lib/ai/widget-theme";
import type { AIChatbotPublicConfig } from "@/types";
import { useChatSession, type ChatMessage } from "./use-chat-session";
import { ChatMessageBubble } from "./chat-message";
import { GuestTicketForm } from "./guest-ticket-form";

const COMPOSER_TEXTAREA_MIN_HEIGHT = 24;
const COMPOSER_TEXTAREA_MAX_HEIGHT = 112;

interface ChatWindowProps {
  config: AIChatbotPublicConfig;
  onClose: () => void;
  /** Accepted for caller compatibility (embed iframe); no longer renders links. */
  embedded?: boolean;
  /** Use the saved Widget tab dimensions outside the embed iframe. */
  sizeMode?: "fixed" | "configured";
  appOrigin?: string;
  /**
   * Scopes the persisted chat session. In the embed iframe this is the host
   * site's origin so each site keeps its own conversation; omit it elsewhere.
   */
  storageNamespace?: string;
  /** Embed snippet key → scopes the bot's answers to one site (+ global). */
  siteKey?: string;
  /** Host origin the widget is embedded on (for optional domain validation). */
  host?: string;
}

export function ChatWindow({
  config,
  onClose,
  embedded,
  sizeMode = "fixed",
  storageNamespace,
  siteKey,
  host,
}: ChatWindowProps) {
  const session = useChatSession(storageNamespace);
  const {
    hydrated,
    visitorId,
    sessionId,
    messages,
    addMessage,
    updateMessage,
    getRecentHistory,
  } = session;

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [lastLogId, setLastLogId] = useState<string | undefined>();
  const [lastUserMessage, setLastUserMessage] = useState("");
  const [handoffDepartment, setHandoffDepartment] = useState<
    string | undefined
  >();

  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const theme = resolveWidgetTheme(config.primaryColor, config.accentColor);
  const headerTitle =
    config.headerTitle?.trim() || config.businessName?.trim() || "Live Chat";
  const configuredSizeStyle: CSSProperties | undefined =
    !embedded && sizeMode === "configured"
      ? {
          width: config.widgetWidth,
          height: config.widgetHeight,
        }
      : undefined;

  useEffect(() => {
    if (hydrated && messages.length === 0) {
      addMessage({
        role: "assistant",
        content: config.welcomeMessage,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, showTicketForm]);

  const resizeComposer = useCallback(() => {
    const textarea = inputRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${
      input.trim()
        ? Math.min(textarea.scrollHeight, COMPOSER_TEXTAREA_MAX_HEIGHT)
        : COMPOSER_TEXTAREA_MIN_HEIGHT
    }px`;
  }, [input]);

  useEffect(() => {
    resizeComposer();
  }, [resizeComposer]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    let frame = 0;
    const scheduleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resizeComposer);
    };

    scheduleResize();
    window.addEventListener("resize", scheduleResize);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", scheduleResize);
      };
    }

    const observer = new ResizeObserver(scheduleResize);
    observer.observe(composer);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", scheduleResize);
    };
  }, [resizeComposer]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const question = input.trim();
    if (!question || isLoading || !hydrated) return;

    setInput("");
    setError(null);
    setShowTicketForm(false);
    setLastUserMessage(question);

    // Capture prior turns before appending the new user message.
    const history = getRecentHistory(6);

    addMessage({ role: "user", content: question });
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          visitorId,
          sessionId,
          history,
          siteKey: siteKey || undefined,
          host: host || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Something went wrong");
        addMessage({
          role: "system",
          content: data.error ?? "Something went wrong",
        });
        return;
      }

      const payload = data.data as {
        matched: boolean;
        answer: string;
        outcome: string;
        escalated: boolean;
        suggestedDepartmentSlug?: string;
        sources?: { title: string; url: string }[];
        logId: string;
      };
      setLastLogId(payload.logId);

      addMessage({
        role: "assistant",
        content: payload.answer,
        matched: payload.matched,
        isFallback: payload.escalated,
        logId: payload.logId,
        sources: payload.sources,
      });

      // The customer agreed to talk to a human → open the ticket form,
      // pre-routed to the department the agent inferred from the chat.
      if (payload.escalated) {
        setHandoffDepartment(payload.suggestedDepartmentSlug);
        setShowTicketForm(true);
      }
    } catch {
      setError("Network error");
      addMessage({ role: "system", content: "Network error — please retry." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketSubmitted = (ticketNumber: string) => {
    setShowTicketForm(false);
    addMessage({
      role: "system",
      content: `Thanks! Ticket ${ticketNumber} is created — we'll reply by email soon.`,
    });
  };

  const handleFeedback = async (
    message: ChatMessage,
    feedback: "up" | "down"
  ) => {
    if (!message.logId || !hydrated) return;
    updateMessage(message.id, { feedback });
    try {
      const res = await fetch("/api/ai/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logId: message.logId,
          visitorId,
          sessionId,
          feedback,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        updateMessage(message.id, { feedback: message.feedback });
      }
    } catch {
      updateMessage(message.id, { feedback: message.feedback });
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-background shadow-2xl",
        // Embedded: fill the iframe (sized by public/widget.js) instead of
        // capping against 100vh, which inside the iframe is only the iframe's
        // own (small) height and squishes the window short.
        embedded
          ? "w-full h-full max-h-full"
          : sizeMode === "configured"
            ? "max-w-full"
          : "w-[22rem] h-[34rem] max-h-[calc(100vh-8rem)]"
      )}
      style={configuredSizeStyle}
    >
      {/* Header — inset, floating rounded bar */}
      <div className="relative px-3 pt-3">
        <header
          className="flex items-center justify-between rounded-2xl px-4 py-3 text-white"
          style={{ background: theme.headerGradient }}
        >
          <p className="text-base font-semibold leading-tight">
            {headerTitle}
          </p>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Avatar straddling the header's bottom edge */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-white p-0.5 shadow-md ring-2 ring-white">
            {config.headerAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.headerAvatarUrl}
                alt={headerTitle}
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
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-background px-4 pb-4 pt-9"
      >
        {messages.map((m: ChatMessage) => (
          <ChatMessageBubble
            key={m.id}
            message={m}
            primaryColor={config.primaryColor}
            accentColor={config.accentColor}
            onFeedback={handleFeedback}
          />
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 pl-9 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Thinking...
          </div>
        )}
        {showTicketForm && hydrated && (
          <GuestTicketForm
            visitorId={visitorId}
            chatLogId={lastLogId}
            defaultMessage={lastUserMessage}
            departmentSlug={handoffDepartment}
            onSubmitted={handleTicketSubmitted}
            onCancel={() => setShowTicketForm(false)}
          />
        )}
      </div>

      {error && (
        <p className="border-t border-destructive/20 bg-destructive/5 px-3 py-1.5 text-[11px] text-destructive">
          {error}
        </p>
      )}

      {/* Input */}
      <div className="space-y-2 px-4 pb-3 pt-2">
        <form
          ref={composerRef}
          onSubmit={handleSend}
          className="relative rounded-[1.75rem] border-2 bg-background py-2.5 pl-4 pr-12"
          style={{ borderColor: theme.primary }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={config.placeholder}
            aria-label="Chat message"
            className="block max-h-28 min-h-6 w-full resize-none overflow-y-auto bg-transparent text-[15px] font-medium leading-6 text-foreground caret-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
            disabled={isLoading || !hydrated}
            maxLength={500}
            autoComplete="off"
            rows={1}
          />
          <button
            type="submit"
            aria-label="Send message"
            title="Send message"
            className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-sm transition-all enabled:hover:brightness-110 enabled:active:scale-95 disabled:opacity-30 disabled:saturate-50"
            style={{ backgroundColor: theme.sendButton }}
            disabled={isLoading || !input.trim() || !hydrated}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </form>

        {/* Footer */}
        {config.showPoweredBy && config.footerText?.trim() && (
          <p className="text-center text-[11px] text-muted-foreground/70">
            {config.footerText}
          </p>
        )}
      </div>
    </div>
  );
}
