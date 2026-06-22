"use client";

import ReactMarkdown from "react-markdown";
import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveWidgetTheme } from "@/lib/ai/widget-theme";
import type { ChatMessage } from "./use-chat-session";

interface ChatMessageBubbleProps {
  message: ChatMessage;
  primaryColor?: string;
  accentColor?: string;
  onFeedback?: (message: ChatMessage, feedback: "up" | "down") => void;
}

export function ChatMessageBubble({
  message,
  primaryColor,
  accentColor,
  onFeedback,
}: ChatMessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const theme = resolveWidgetTheme(primaryColor, accentColor);

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <p className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
          {message.content}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-2 items-end",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
          style={{ background: theme.headerGradient }}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          "flex max-w-[80%] flex-col gap-1.5 rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
          isUser
            ? "text-white rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
        style={isUser ? { backgroundColor: theme.primary } : undefined}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          // Assistant replies in markdown; render it so links/bold/lists show
          // properly instead of raw syntax. react-markdown escapes HTML, so
          // there's no injection surface from echoed knowledge content.
          <div
            className={cn(
              "space-y-2 [&_p]:m-0",
              "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-4",
              "[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-4",
              "[&_li]:my-0.5 [&_strong]:font-semibold",
              "[&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]"
            )}
          >
            <ReactMarkdown
              components={{
                a: (props) => (
                  <a
                    href={props.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline underline-offset-2 break-words"
                    style={{ color: theme.primary }}
                  >
                    {props.children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-0.5 flex flex-col gap-0.5 border-t border-border/50 pt-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
              Sources
            </span>
            {message.sources.map((s, i) => (
              <a
                key={`${s.url}-${i}`}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-xs underline decoration-dotted underline-offset-2 hover:decoration-solid"
                style={{ color: theme.primary }}
                title={s.url}
              >
                {s.title}
              </a>
            ))}
          </div>
        )}
        {!isUser && message.logId && onFeedback && (
          <div className="mt-0.5 flex items-center gap-1 border-t border-border/50 pt-1.5">
            {(["up", "down"] as const).map((value) => {
              const active = message.feedback === value;
              const Icon = value === "up" ? ThumbsUp : ThumbsDown;
              return (
                <button
                  key={value}
                  type="button"
                  title={
                    value === "up"
                      ? "Mark answer helpful"
                      : "Mark answer not helpful"
                  }
                  aria-label={
                    value === "up"
                      ? "Mark answer helpful"
                      : "Mark answer not helpful"
                  }
                  onClick={() => onFeedback(message, value)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border transition-colors",
                    active
                      ? "border-transparent text-white"
                      : "border-border/60 text-muted-foreground hover:bg-background/70"
                  )}
                  style={active ? { backgroundColor: theme.primary } : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
