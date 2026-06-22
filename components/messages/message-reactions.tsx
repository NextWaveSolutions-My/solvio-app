"use client";

/**
 * Message Reactions Component
 * 
 * Displays emoji reactions on messages
 */

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toggleMessageReaction } from "@/actions/message-reactions";
import { Smile } from "lucide-react";
import { toast } from "sonner";
import type { MessageReaction } from "@/types/realtime";

interface MessageReactionsProps {
  messageId: string;
  currentUserId: string;
  reactions: MessageReaction[];
}

const COMMON_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉", "🔥", "👏"];

export function MessageReactions({
  messageId,
  currentUserId,
  reactions,
}: MessageReactionsProps) {
  const handleReaction = async (emoji: string) => {
    const result = await toggleMessageReaction(messageId, emoji);
    if (!result.success) {
      toast.error(result.error || "Failed to add reaction");
    }
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, MessageReaction[]>);

  const hasReactions = Object.keys(groupedReactions).length > 0;

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Display existing reactions */}
      {hasReactions && (
        <div className="flex gap-1 flex-wrap">
          {Object.entries(groupedReactions).map(([emoji, reactions]) => {
            const userReacted = reactions.some((r) => r.user_id === currentUserId);
            const count = reactions.length;

            return (
              <Button
                key={emoji}
                variant={userReacted ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-sm"
                onClick={() => handleReaction(emoji)}
                title={reactions.map((r) => r.user_name).join(", ")}
              >
                <span className="mr-1">{emoji}</span>
                <span className="text-xs">{count}</span>
              </Button>
            );
          })}
        </div>
      )}

      {/* Add reaction button */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title="Add reaction"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-4 gap-1">
            {COMMON_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-xl hover:bg-accent"
                onClick={() => handleReaction(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
