"use client";

import { useCallback, useEffect, useState } from "react";

import { useSocketConnection } from "@/hooks/useSocketConnection";
import type { Message, TypingIndicator } from "@/types/realtime";

export function useConversationMessages(
  conversationId: string | null,
  userId: string | null
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { socket } = useSocketConnection(userId);

  const refreshMessages = useCallback(async () => {
    if (!conversationId || !userId) {
      setMessages([]);
      setTypingUsers([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      const payload = (await response.json()) as { messages: Message[] };
      setMessages(payload.messages || []);
      setError(null);
    } catch (fetchError) {
      console.error("Error fetching messages:", fetchError);
      setError(fetchError as Error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  useEffect(() => {
    refreshMessages();
  }, [refreshMessages]);

  useEffect(() => {
    if (!socket || !conversationId || !userId) {
      return;
    }

    const joinConversation = () => {
      socket.emit("chat:conversation:join", { conversationId });
    };

    const handleMessageCreated = (message: Message) => {
      if (message.conversation_id !== conversationId) {
        return;
      }

      setMessages((current) => {
        if (current.some((entry) => entry.id === message.id)) {
          return current;
        }

        return [...current, message];
      });
    };

    const handleMessageUpdated = (message: Message) => {
      if (message.conversation_id !== conversationId) {
        return;
      }

      setMessages((current) =>
        current.map((entry) => (entry.id === message.id ? message : entry))
      );
    };

    const handleMessageDeleted = ({
      conversationId: deletedConversationId,
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) => {
      if (deletedConversationId !== conversationId) {
        return;
      }

      setMessages((current) =>
        current.filter((message) => message.id !== messageId)
      );
    };

    const handleMessagesRead = ({
      conversationId: readConversationId,
      messageIds,
      userId: readerId,
    }: {
      conversationId: string;
      messageIds: string[];
      userId: string;
    }) => {
      if (readConversationId !== conversationId) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          messageIds.includes(message.id) && !message.read_by.includes(readerId)
            ? {
                ...message,
                read_by: [...message.read_by, readerId],
              }
            : message
        )
      );
    };

    const handleTypingState = ({
      conversationId: typingConversationId,
      typingUsers: nextTypingUsers,
    }: {
      conversationId: string;
      typingUsers: TypingIndicator[];
    }) => {
      if (typingConversationId !== conversationId) {
        return;
      }

      setTypingUsers(
        nextTypingUsers.filter((typingUser) => typingUser.user_id !== userId)
      );
    };

    const handleConnect = () => {
      joinConversation();
      refreshMessages();
    };

    joinConversation();
    socket.on("connect", handleConnect);
    socket.on("chat:message:created", handleMessageCreated);
    socket.on("chat:message:updated", handleMessageUpdated);
    socket.on("chat:message:deleted", handleMessageDeleted);
    socket.on("chat:messages:read", handleMessagesRead);
    socket.on("chat:typing:state", handleTypingState);

    return () => {
      socket.emit("chat:typing:set", {
        conversationId,
        isTyping: false,
      });
      socket.emit("chat:conversation:leave", { conversationId });
      socket.off("connect", handleConnect);
      socket.off("chat:message:created", handleMessageCreated);
      socket.off("chat:message:updated", handleMessageUpdated);
      socket.off("chat:message:deleted", handleMessageDeleted);
      socket.off("chat:messages:read", handleMessagesRead);
      socket.off("chat:typing:state", handleTypingState);
    };
  }, [conversationId, refreshMessages, socket, userId]);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !conversationId) {
        return;
      }

      socket.emit("chat:typing:set", { conversationId, isTyping });
    },
    [conversationId, socket]
  );

  return {
    messages,
    typingUsers,
    loading,
    error,
    refreshMessages,
    setTyping,
  };
}
