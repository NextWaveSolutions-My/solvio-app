import type {
  ClientNotification,
  ConversationWithParticipants,
  Message,
  SerializedComment,
  TypingIndicator,
  UserPresenceState,
} from "@/types/realtime";

export interface SocketSessionUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export interface ServerToClientEvents {
  "presence:snapshot": (presence: UserPresenceState[]) => void;
  "presence:updated": (presence: UserPresenceState) => void;
  "chat:conversation:upsert": (
    conversation: ConversationWithParticipants
  ) => void;
  "chat:conversation:removed": (payload: {
    conversationId: string;
  }) => void;
  "chat:message:created": (message: Message) => void;
  "chat:message:updated": (message: Message) => void;
  "chat:message:deleted": (payload: {
    conversationId: string;
    messageId: string;
  }) => void;
  "chat:messages:read": (payload: {
    conversationId: string;
    messageIds: string[];
    userId: string;
    readAt: string;
  }) => void;
  "chat:typing:state": (payload: {
    conversationId: string;
    typingUsers: TypingIndicator[];
  }) => void;
  "notification:created": (notification: ClientNotification) => void;
  "notification:updated": (notification: ClientNotification) => void;
  "notification:deleted": (payload: { notificationIds: string[] }) => void;
  "comment:created": (payload: {
    ticketId: string;
    comment: SerializedComment;
  }) => void;
  "comment:updated": (payload: {
    ticketId: string;
    comment: SerializedComment;
  }) => void;
  "comment:deleted": (payload: {
    ticketId: string;
    commentId: string;
  }) => void;
}

export interface ClientToServerEvents {
  "chat:conversation:join": (payload: { conversationId: string }) => void;
  "chat:conversation:leave": (payload: { conversationId: string }) => void;
  "chat:typing:set": (payload: {
    conversationId: string;
    isTyping: boolean;
  }) => void;
  "ticket:join": (payload: { ticketId: string }) => void;
  "ticket:leave": (payload: { ticketId: string }) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  user: SocketSessionUser;
}
