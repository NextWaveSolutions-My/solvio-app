"use client";

import { useEffect, useState } from "react";
import type { AIChatbotPublicConfig } from "@/types";

/**
 * Fetches the public AI chatbot config (`/api/ai/chat/config`).
 * Returns `null` until loaded; `config.enabled` reflects the admin toggle.
 */
export function useAiChatConfig(): AIChatbotPublicConfig | null {
  const [config, setConfig] = useState<AIChatbotPublicConfig | null>(null);

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

  return config;
}
