export type ConversationType = "direct" | "group";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
};

export type ConversationParticipantWithUser = {
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  user_image?: string;
};

export type ConversationMessageSummary = {
  id: string;
  content: string;
  sender_id: string;
  sender_name: string | null;
  created_at: string;
  is_deleted: boolean;
};

export type Conversation = {
  id: string;
  type: ConversationType;
  participant_ids: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  lastMessage?: ConversationMessageSummary | null;
};

export type ConversationWithParticipants = Conversation & {
  participants: ConversationParticipantWithUser[];
  unreadCount: number;
};

export type MessageAttachment = {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type: string | null;
  thumbnail_url: string | null;
  uploaded_by: string;
  created_at: string;
};

export type MessageEditHistory = {
  id: string;
  previous_content: string;
  edited_by: string;
  edited_at: string;
};

export type MessageReaction = {
  id: string;
  user_id: string;
  user_name: string | null;
  emoji: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  content: string;
  attachments: MessageAttachment[];
  reactions: MessageReaction[];
  read_by: string[];
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  is_edited: boolean;
  edited_at: string | null;
  reply_to_id: string | null;
  edit_history: MessageEditHistory[];
  created_at: string;
  updated_at: string;
};

export type TypingIndicator = {
  conversation_id: string;
  user_id: string;
  user_name: string | null;
  updated_at: string;
};

export type UserPresenceState = {
  user_id: string;
  status: "online" | "offline" | "away";
  last_seen: string;
  updated_at: string;
};

export type ClientNotification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read: boolean;
  created_at: string;
  read_at: string | null;
};

export type SerializedComment = {
  _id: string;
  id?: string;
  ticketId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  parentCommentId?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
};
