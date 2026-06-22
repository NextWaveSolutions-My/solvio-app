"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import type { AIChatbotPublicConfig } from "@/types";
import { ChatWindow } from "@/components/ai-chat/chat-window";
import { AI_CHAT_OPEN_EVENT } from "@/lib/ai/open-ai-chat";

interface FloatingChatButtonProps {
  className?: string;
}

const HIDDEN_PATH_PREFIXES = [
  "/admin",
  "/dashboard",
  "/support-agent",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/api",
  "/embed",
];

function isHiddenPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Floating launcher for the AI support agent chat. WhatsApp moved to the
 * public header, so this corner belongs to the AI assistant alone.
 */
export function FloatingChatButton({ className }: FloatingChatButtonProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIChatbotPublicConfig | null>(null);
  const [showAiChat, setShowAiChat] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai/chat/config")
      .then((r) => r.json())
      .then((data: AIChatbotPublicConfig) => {
        if (!cancelled) setAiConfig(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Delay visibility for smooth entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Allow other components (e.g. the docs "Ask AI" button) to open AI chat.
  useEffect(() => {
    const handler = () => {
      if (aiConfig?.enabled) {
        setShowAiChat(true);
      }
    };
    window.addEventListener(AI_CHAT_OPEN_EVENT, handler);
    return () => window.removeEventListener(AI_CHAT_OPEN_EVENT, handler);
  }, [aiConfig?.enabled]);

  const showAi = aiConfig?.enabled === true;

  if (isHiddenPath(pathname) || !showAi || !aiConfig) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 transition-all duration-500",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
        className
      )}
    >
      {/* AI Chat Window */}
      {showAiChat && (
        <ChatWindow config={aiConfig} onClose={() => setShowAiChat(false)} />
      )}

      {/* Launcher (hidden while AI window is open — it has its own close) */}
      {!showAiChat && (
        <Button
          onClick={() => setShowAiChat(true)}
          size="lg"
          aria-label="Chat with our AI assistant"
          title="Chat with our AI assistant"
          className={cn(
            "relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300",
            "bg-primary hover:bg-primary/90 text-primary-foreground hover:scale-105 active:scale-95"
          )}
        >
          <MessageCircle className="h-6 w-6" />
          {/* Online indicator */}
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500" />
          </span>
        </Button>
      )}
    </div>
  );
}
