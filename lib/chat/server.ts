import { ObjectId } from "mongodb";

import { getCollection } from "@/lib/db";
import type { User } from "@/types";
import type {
  ConversationMessageSummary,
  ConversationParticipantWithUser,
  ConversationType,
  ConversationWithParticipants,
  Message,
  MessageAttachment,
  MessageEditHistory,
  MessageReaction,
  UserSummary,
} from "@/types/realtime";

type ConversationDocument = {
  _id: ObjectId;
  id: string;
  type: ConversationType;
  participantIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  lastMessage: ConversationMessageSummary | null;
};

type MessageDocument = {
  _id: ObjectId;
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string | null;
  content: string;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  readBy: string[];
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: string | null;
  isEdited: boolean;
  editedAt: Date | null;
  replyToId: string | null;
  editHistory: MessageEditHistory[];
  createdAt: Date;
  updatedAt: Date;
};

type CreateConversationInput = {
  participantIds: string[];
  createdBy: string;
};

type CreateMessageInput = {
  conversationId: string;
  senderId: string;
  senderName: string | null;
  content: string;
  replyToId?: string | null;
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) return null;
  if (typeof value === "string") return new Date(value).toISOString();
  return value.toISOString();
}

function createId() {
  return new ObjectId().toString();
}

async function getUsersMap(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, UserSummary>();
  }

  const usersCollection = await getCollection<User>("user");
  const objectIds = userIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const users = await usersCollection
    .find(
      {
        $or: [
          { id: { $in: userIds } },
          ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
        ],
      },
      {
        projection: {
          id: 1,
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          image: 1,
        },
      }
    )
    .toArray();

  const map = new Map<string, UserSummary>();

  users.forEach((user) => {
    const id = user.id || user._id.toString();
    map.set(id, {
      id,
      name: user.name || "Unknown User",
      email: user.email || "",
      role: user.role || "customer",
      image: user.image || undefined,
    });
  });

  return map;
}

function serializeConversationParticipants(
  conversation: ConversationDocument,
  usersMap: Map<string, UserSummary>
) {
  return conversation.participantIds.map<ConversationParticipantWithUser>(
    (userId) => {
      const user = usersMap.get(userId);

      return {
        user_id: userId,
        joined_at: conversation.createdAt.toISOString(),
        last_read_at: null,
        user_name: user?.name || userId,
        user_email: user?.email || "",
        user_role: user?.role || "customer",
        user_image: user?.image,
      };
    }
  );
}

function serializeConversation(
  conversation: ConversationDocument,
  participants: ConversationParticipantWithUser[],
  unreadCount: number
): ConversationWithParticipants {
  return {
    id: conversation.id,
    type: conversation.type,
    participant_ids: conversation.participantIds,
    created_by: conversation.createdBy,
    created_at: conversation.createdAt.toISOString(),
    updated_at: conversation.updatedAt.toISOString(),
    last_message_at: toIsoString(conversation.lastMessageAt),
    lastMessage: conversation.lastMessage
      ? {
          ...conversation.lastMessage,
          created_at: new Date(
            conversation.lastMessage.created_at
          ).toISOString(),
        }
      : null,
    participants,
    unreadCount,
  };
}

function serializeMessageDocument(message: MessageDocument): Message {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    sender_id: message.senderId,
    sender_name: message.senderName,
    content: message.content,
    attachments: (message.attachments || []).map((attachment) => ({
      ...attachment,
      created_at: new Date(attachment.created_at).toISOString(),
    })),
    reactions: (message.reactions || []).map((reaction) => ({
      ...reaction,
      created_at: new Date(reaction.created_at).toISOString(),
    })),
    read_by: message.readBy || [],
    is_deleted: message.isDeleted,
    deleted_at: toIsoString(message.deletedAt),
    deleted_by: message.deletedBy,
    is_edited: message.isEdited,
    edited_at: toIsoString(message.editedAt),
    reply_to_id: message.replyToId,
    edit_history: (message.editHistory || []).map((entry) => ({
      ...entry,
      edited_at: new Date(entry.edited_at).toISOString(),
    })),
    created_at: message.createdAt.toISOString(),
    updated_at: message.updatedAt.toISOString(),
  };
}

function toConversationMessageSummary(
  message: MessageDocument
): ConversationMessageSummary {
  return {
    id: message.id,
    content: message.content,
    sender_id: message.senderId,
    sender_name: message.senderName,
    created_at: message.createdAt.toISOString(),
    is_deleted: message.isDeleted,
  };
}

export async function getConversationDocument(conversationId: string) {
  const conversationsCollection =
    await getCollection<ConversationDocument>("conversations");
  return conversationsCollection.findOne({ id: conversationId });
}

export async function getMessageDocument(messageId: string) {
  const messagesCollection = await getCollection<MessageDocument>("messages");
  return messagesCollection.findOne({ id: messageId });
}

export async function ensureConversationParticipant(
  conversationId: string,
  userId: string
) {
  const conversation = await getConversationDocument(conversationId);

  if (!conversation || !conversation.participantIds.includes(userId)) {
    return null;
  }

  return conversation;
}

export async function createConversationRecord(input: CreateConversationInput) {
  const conversationsCollection =
    await getCollection<ConversationDocument>("conversations");

  const conversationId = createId();
  const now = new Date();
  const document: ConversationDocument = {
    _id: new ObjectId(conversationId),
    id: conversationId,
    type: input.participantIds.length === 2 ? "direct" : "group",
    participantIds: input.participantIds,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: null,
    lastMessage: null,
  };

  await conversationsCollection.insertOne(document);
  return document;
}

export async function createMessageRecord(input: CreateMessageInput) {
  const messagesCollection = await getCollection<MessageDocument>("messages");
  const id = createId();
  const now = new Date();

  const document: MessageDocument = {
    _id: new ObjectId(id),
    id,
    conversationId: input.conversationId,
    senderId: input.senderId,
    senderName: input.senderName,
    content: input.content,
    attachments: [],
    reactions: [],
    readBy: [input.senderId],
    isDeleted: false,
    deletedAt: null,
    deletedBy: null,
    isEdited: false,
    editedAt: null,
    replyToId: input.replyToId ?? null,
    editHistory: [],
    createdAt: now,
    updatedAt: now,
  };

  await messagesCollection.insertOne(document);
  await updateConversationLastMessage(input.conversationId);

  return document;
}

export async function updateConversationLastMessage(conversationId: string) {
  const conversationsCollection =
    await getCollection<ConversationDocument>("conversations");
  const messagesCollection = await getCollection<MessageDocument>("messages");
  const now = new Date();

  const latestMessage = await messagesCollection.findOne(
    { conversationId },
    { sort: { createdAt: -1 } }
  );

  await conversationsCollection.updateOne(
    { id: conversationId },
    {
      $set: {
        updatedAt: now,
        lastMessageAt: latestMessage?.createdAt || null,
        lastMessage: latestMessage
          ? toConversationMessageSummary(latestMessage)
          : null,
      },
    }
  );

  return latestMessage;
}

export async function getConversationMessagesForUser(
  conversationId: string,
  userId: string
) {
  const conversation = await ensureConversationParticipant(conversationId, userId);
  if (!conversation) {
    return null;
  }

  const messagesCollection = await getCollection<MessageDocument>("messages");
  const messages = await messagesCollection
    .find({ conversationId })
    .sort({ createdAt: 1 })
    .toArray();

  return messages.map(serializeMessageDocument);
}

export async function getConversationSummariesForUser(userId: string) {
  const conversationsCollection =
    await getCollection<ConversationDocument>("conversations");
  const messagesCollection = await getCollection<MessageDocument>("messages");

  const conversations = await conversationsCollection
    .find({ participantIds: userId })
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .toArray();

  if (conversations.length === 0) {
    return [];
  }

  const uniqueParticipantIds = Array.from(
    new Set(conversations.flatMap((conversation) => conversation.participantIds))
  );
  const usersMap = await getUsersMap(uniqueParticipantIds);

  const unreadCounts = await messagesCollection
    .aggregate<{ _id: string; count: number }>([
      {
        $match: {
          conversationId: { $in: conversations.map((conversation) => conversation.id) },
          senderId: { $ne: userId },
          readBy: { $ne: userId },
        },
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const unreadMap = new Map(
    unreadCounts.map((item) => [item._id, item.count] as const)
  );

  return conversations.map((conversation) =>
    serializeConversation(
      conversation,
      serializeConversationParticipants(conversation, usersMap),
      unreadMap.get(conversation.id) || 0
    )
  );
}

export async function getConversationSummaryForUser(
  conversationId: string,
  userId: string
) {
  const conversations = await getConversationSummariesForUser(userId);
  return conversations.find((conversation) => conversation.id === conversationId) || null;
}

export async function getParticipantIdsForConversation(conversationId: string) {
  const conversation = await getConversationDocument(conversationId);
  return conversation?.participantIds || [];
}

export async function getMessageForConversationUser(
  messageId: string,
  userId: string
) {
  const message = await getMessageDocument(messageId);
  if (!message) {
    return null;
  }

  const conversation = await ensureConversationParticipant(
    message.conversationId,
    userId
  );
  if (!conversation) {
    return null;
  }

  return serializeMessageDocument(message);
}

export async function appendAttachmentToMessage(
  messageId: string,
  attachment: MessageAttachment
) {
  const messagesCollection = await getCollection<MessageDocument>("messages");
  const now = new Date();

  await messagesCollection.updateOne(
    { id: messageId },
    {
      $push: { attachments: attachment },
      $set: { updatedAt: now },
    }
  );

  const updatedMessage = await getMessageDocument(messageId);
  if (!updatedMessage) {
    return null;
  }

  await updateConversationLastMessage(updatedMessage.conversationId);
  return updatedMessage;
}

export async function removeAttachmentFromMessage(
  messageId: string,
  attachmentId: string
) {
  const messagesCollection = await getCollection<MessageDocument>("messages");
  const now = new Date();

  await messagesCollection.updateOne(
    { id: messageId },
    {
      $pull: { attachments: { id: attachmentId } },
      $set: { updatedAt: now },
    }
  );

  const updatedMessage = await getMessageDocument(messageId);
  if (!updatedMessage) {
    return null;
  }

  await updateConversationLastMessage(updatedMessage.conversationId);
  return updatedMessage;
}

export async function replaceMessageDocument(message: MessageDocument) {
  const messagesCollection = await getCollection<MessageDocument>("messages");
  await messagesCollection.replaceOne({ id: message.id }, message);
  await updateConversationLastMessage(message.conversationId);
  return message;
}

export async function serializeUsersByIds(userIds: string[]) {
  const usersMap = await getUsersMap(userIds);
  return Object.fromEntries(usersMap.entries());
}
