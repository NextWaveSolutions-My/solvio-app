"use server";

/**
 * Server Actions for Message Reactions
 */

import { auth } from "@/lib/auth";
import {
  ensureConversationParticipant,
  getMessageDocument,
  getMessageForConversationUser,
  replaceMessageDocument,
} from "@/lib/chat/server";
import { emitConversationSummaryToParticipants, emitMessageUpdated } from "@/lib/socket/server";
import { headers } from "next/headers";
import type { MessageReaction } from "@/types/realtime";

export async function addMessageReaction(
  messageId: string,
  emoji: string
): Promise<{ success: boolean; reaction?: MessageReaction; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!emoji || emoji.length > 10) {
      return { success: false, error: "Invalid emoji" };
    }

    const message = await getMessageDocument(messageId);
    if (!message) {
      return { success: false, error: "Message not found" };
    }

    const conversation = await ensureConversationParticipant(
      message.conversationId,
      session.user.id
    );
    if (!conversation) {
      return { success: false, error: "Unauthorized" };
    }

    const exists = (message.reactions || []).some(
      (reaction) =>
        reaction.user_id === session.user.id && reaction.emoji === emoji
    );

    if (exists) {
      return { success: false, error: "You already reacted with this emoji" };
    }

    const reaction: MessageReaction = {
      id: crypto.randomUUID(),
      user_id: session.user.id,
      user_name: session.user.name || session.user.email,
      emoji,
      created_at: new Date().toISOString(),
    };

    message.reactions = [...(message.reactions || []), reaction];
    message.updatedAt = new Date();
    await replaceMessageDocument(message);

    const serialized = await getMessageForConversationUser(
      messageId,
      session.user.id
    );

    if (serialized) {
      emitMessageUpdated(serialized);
      await emitConversationSummaryToParticipants(message.conversationId);
    }

    return { success: true, reaction };
  } catch (error) {
    console.error("Error adding reaction:", error);
    return { success: false, error: "Failed to add reaction" };
  }
}

export async function removeMessageReaction(
  messageId: string,
  emoji: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const message = await getMessageDocument(messageId);
    if (!message) {
      return { success: false, error: "Message not found" };
    }

    const conversation = await ensureConversationParticipant(
      message.conversationId,
      session.user.id
    );
    if (!conversation) {
      return { success: false, error: "Unauthorized" };
    }

    message.reactions = (message.reactions || []).filter(
      (reaction) =>
        !(
          reaction.user_id === session.user.id && reaction.emoji === emoji
        )
    );
    message.updatedAt = new Date();

    await replaceMessageDocument(message);

    const serialized = await getMessageForConversationUser(
      messageId,
      session.user.id
    );

    if (serialized) {
      emitMessageUpdated(serialized);
      await emitConversationSummaryToParticipants(message.conversationId);
    }

    return { success: true };
  } catch (error) {
    console.error("Error removing reaction:", error);
    return { success: false, error: "Failed to remove reaction" };
  }
}

export async function getMessageReactions(
  messageId: string
): Promise<{ success: boolean; reactions?: MessageReaction[]; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const message = await getMessageDocument(messageId);

    if (!message) {
      return { success: false, error: "Message not found" };
    }

    const conversation = await ensureConversationParticipant(
      message.conversationId,
      session.user.id
    );
    if (!conversation) {
      return { success: false, error: "Unauthorized" };
    }

    return {
      success: true,
      reactions: [...(message.reactions || [])].sort((left, right) =>
        left.created_at.localeCompare(right.created_at)
      ),
    };
  } catch (error) {
    console.error("Error fetching reactions:", error);
    return { success: false, error: "Failed to fetch reactions" };
  }
}

export async function toggleMessageReaction(
  messageId: string,
  emoji: string
): Promise<{ success: boolean; added?: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    const message = await getMessageDocument(messageId);
    if (!message) {
      return { success: false, error: "Message not found" };
    }

    const conversation = await ensureConversationParticipant(
      message.conversationId,
      session.user.id
    );
    if (!conversation) {
      return { success: false, error: "Unauthorized" };
    }

    const exists = (message.reactions || []).some(
      (reaction) =>
        reaction.user_id === session.user.id && reaction.emoji === emoji
    );

    if (exists) {
      const result = await removeMessageReaction(messageId, emoji);
      return { ...result, added: false };
    }

    const result = await addMessageReaction(messageId, emoji);
    return { ...result, added: true };
  } catch (error) {
    console.error("Error toggling reaction:", error);
    return { success: false, error: "Failed to toggle reaction" };
  }
}
