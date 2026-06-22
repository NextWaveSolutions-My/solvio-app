"use server";

/**
 * Server Actions for Message Editing
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
import type { Message, MessageEditHistory } from "@/types/realtime";

export async function editMessage(
  messageId: string,
  newContent: string
): Promise<{ success: boolean; message?: Message; error?: string }> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }

    if (!newContent.trim()) {
      return { success: false, error: "Message content cannot be empty" };
    }

    const message = await getMessageDocument(messageId);
    if (!message) {
      return { success: false, error: "Message not found" };
    }

    if (message.senderId !== session.user.id) {
      return { success: false, error: "You can only edit your own messages" };
    }

    if (message.isDeleted) {
      return { success: false, error: "Cannot edit deleted message" };
    }

    const now = new Date().toISOString();
    message.editHistory = [
      ...(message.editHistory || []),
      {
        id: crypto.randomUUID(),
        previous_content: message.content,
        edited_by: session.user.id,
        edited_at: now,
      },
    ];
    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date(now);
    message.updatedAt = new Date(now);

    await replaceMessageDocument(message);

    const serialized = await getMessageForConversationUser(
      messageId,
      session.user.id
    );

    if (serialized) {
      emitMessageUpdated(serialized);
      await emitConversationSummaryToParticipants(message.conversationId);
    }

    return { success: true, message: serialized || undefined };
  } catch (error) {
    console.error("Error editing message:", error);
    return { success: false, error: "Failed to edit message" };
  }
}

export async function getMessageEditHistory(
  messageId: string
): Promise<{ success: boolean; history?: MessageEditHistory[]; error?: string }> {
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
      history: [...(message.editHistory || [])].sort((left, right) =>
        right.edited_at.localeCompare(left.edited_at)
      ),
    };
  } catch (error) {
    console.error("Error fetching edit history:", error);
    return { success: false, error: "Failed to fetch edit history" };
  }
}

export async function deleteMessage(
  messageId: string
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

    if (message.senderId !== session.user.id) {
      return { success: false, error: "You can only delete your own messages" };
    }

    if (message.isDeleted) {
      return { success: false, error: "Message already deleted" };
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = session.user.id;
    message.content = "[Message deleted]";
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
    console.error("Error deleting message:", error);
    return { success: false, error: "Failed to delete message" };
  }
}
