"use client";

import { useCallback, useEffect, useState } from "react";

export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  matched?: boolean;
  matchScore?: number;
  logId?: string;
  isFallback?: boolean;
  /** Clickable web-page citations shown beneath an assistant answer. */
  sources?: { title: string; url: string }[];
  feedback?: "up" | "down";
}

interface PersistedSession {
  visitorId: string;
  sessionId: string;
  messages: ChatMessage[];
}

export const CHAT_SESSION_STORAGE_KEY = "solvio-ai-chat-session-v1";

/**
 * The embed widget always runs inside a same-origin iframe (the Solvio app), so
 * a fixed localStorage key would be shared by every third-party site that
 * embeds it — making all of them show the same conversation. Namespacing the
 * key by the host site's origin keeps each site's chat (and its visitor/session
 * IDs) separate. Non-embed callers pass no namespace and keep the plain key.
 */
function storageKeyFor(namespace?: string): string {
  return namespace
    ? `${CHAT_SESSION_STORAGE_KEY}:${namespace}`
    : CHAT_SESSION_STORAGE_KEY;
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadSession(storageKey: string): PersistedSession {
  if (typeof window === "undefined") {
    return { visitorId: "", sessionId: "", messages: [] };
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedSession;
      if (parsed.visitorId && parsed.sessionId && Array.isArray(parsed.messages)) {
        return parsed;
      }
    }
  } catch {
    // fall through
  }
  return {
    visitorId: uuid(),
    sessionId: uuid(),
    messages: [],
  };
}

export function useChatSession(namespace?: string) {
  const storageKey = storageKeyFor(namespace);
  const [visitorId, setVisitorId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Reload whenever the key changes — the host origin (and thus the namespace)
  // can resolve a tick after mount inside the embed iframe. Hydrating React
  // state from localStorage keyed on the namespace inherently needs setState
  // here; the writes batch into a single render, so the rule's cascade concern
  // doesn't apply (and dropping the dep would just trip exhaustive-deps).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const session = loadSession(storageKey);
    setVisitorId(session.visitorId);
    setSessionId(session.sessionId);
    setMessages(session.messages);
    setHydrated(true);
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ visitorId, sessionId, messages })
      );
    } catch {
      // quota exceeded or unavailable — ignore
    }
  }, [storageKey, visitorId, sessionId, messages, hydrated]);

  const addMessage = useCallback((msg: Omit<ChatMessage, "id" | "createdAt">) => {
    const full: ChatMessage = {
      ...msg,
      id: uuid(),
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, full]);
    return full;
  }, []);

  const updateMessage = useCallback(
    (id: string, patch: Partial<ChatMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const clear = useCallback(() => {
    const nextSessionId = uuid();
    setSessionId(nextSessionId);
    setMessages([]);
  }, []);

  const getRecentHistory = useCallback(
    (limit = 6): { role: "user" | "assistant"; content: string }[] =>
      messages
        .filter(
          (m) => (m.role === "user" || m.role === "assistant") && m.content
        )
        .slice(-limit)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
    [messages]
  );

  return {
    hydrated,
    visitorId,
    sessionId,
    messages,
    addMessage,
    updateMessage,
    clear,
    getRecentHistory,
  };
}
