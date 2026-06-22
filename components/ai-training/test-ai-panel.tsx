"use client";

import { useState } from "react";
import { Loader2, MessageSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChatWindow } from "@/components/ai-chat/chat-window";
import { useAiChatConfig } from "@/components/ai-chat/use-ai-chat-config";
import { CHAT_SESSION_STORAGE_KEY } from "@/components/ai-chat/use-chat-session";

interface TestAIPanelProps {
  widgetWidth?: number;
  widgetHeight?: number;
}

export function TestAIPanel({
  widgetWidth,
  widgetHeight,
}: TestAIPanelProps) {
  const config = useAiChatConfig();
  const testConfig = config
    ? {
        ...config,
        widgetWidth: widgetWidth ?? config.widgetWidth,
        widgetHeight: widgetHeight ?? config.widgetHeight,
      }
    : null;
  // Bumping the key remounts ChatWindow with a fresh session.
  const [resetKey, setResetKey] = useState(0);

  const handleReset = () => {
    try {
      window.localStorage.removeItem(CHAT_SESSION_STORAGE_KEY);
    } catch {
      // storage unavailable — ignore
    }
    setResetKey((k) => k + 1);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Live test chat
            </CardTitle>
            <CardDescription>
              Try queries the way a customer would. Save changes before testing
              — it uses the live settings.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="shrink-0 text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="ml-1.5">Reset</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {config && !config.enabled && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            The chatbot is currently disabled in Settings. Enable the agent to
            test live responses.
          </div>
        )}
        <div className="flex justify-center overflow-auto rounded-xl bg-muted/30 px-4 py-8">
          {testConfig === null ? (
            <div className="flex h-136 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading live settings…
            </div>
          ) : (
            <ChatWindow
              key={resetKey}
              config={testConfig}
              onClose={handleReset}
              sizeMode="configured"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
