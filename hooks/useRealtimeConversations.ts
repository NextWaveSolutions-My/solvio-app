"use client";

import { useCallback, useEffect, useState } from "react";

import { useSocketConnection } from "@/hooks/useSocketConnection";
import type { ConversationWithParticipants } from "@/types/realtime";

function sortConversations(conversations: ConversationWithParticipants[]) {
  return [...conversations].sort((left, right) => {
    const leftDate = new Date(
      left.last_message_at || left.created_at
    ).getTime();
    const rightDate = new Date(
      right.last_message_at || right.created_at
    ).getTime();
    return rightDate - leftDate;
  });
}

export { type ConversationWithParticipants };

export function useRealtimeConversations(userId: string | null) {
  const [conversations, setConversations] = useState<
    ConversationWithParticipants[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { socket } = useSocketConnection(userId);

  const refreshConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/chat/conversations", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load conversations");
      }

      const payload = (await response.json()) as {
        conversations: ConversationWithParticipants[];
      };
      setConversations(sortConversations(payload.conversations || []));
      setError(null);
    } catch (fetchError) {
      console.error("Error fetching conversations:", fetchError);
      setError(fetchError as Error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  useEffect(() => {
    if (!socket || !userId) {
      return;
    }

    const handleConversationUpsert = (
      conversation: ConversationWithParticipants
    ) => {
      setConversations((current) => {
        const next = current.filter((item) => item.id !== conversation.id);
        next.unshift(conversation);
        return sortConversations(next);
      });
    };

    const handleConversationRemoved = ({
      conversationId,
    }: {
      conversationId: string;
    }) => {
      setConversations((current) =>
        current.filter((conversation) => conversation.id !== conversationId)
      );
    };

    const handleConnect = () => {
      refreshConversations();
    };

    socket.on("chat:conversation:upsert", handleConversationUpsert);
    socket.on("chat:conversation:removed", handleConversationRemoved);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("chat:conversation:upsert", handleConversationUpsert);
      socket.off("chat:conversation:removed", handleConversationRemoved);
      socket.off("connect", handleConnect);
    };
  }, [refreshConversations, socket, userId]);

  return { conversations, loading, error, refreshConversations };
}
