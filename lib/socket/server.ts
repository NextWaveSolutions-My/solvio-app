import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";

import { auth } from "@/lib/auth";
import {
  ensureConversationParticipant,
  getConversationSummaryForUser,
  getParticipantIdsForConversation,
} from "@/lib/chat/server";
import { findRequestById } from "@/lib/request-utils";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
  SocketSessionUser,
} from "@/lib/socket/types";
import type {
  ClientNotification,
  Message,
  SerializedComment,
  TypingIndicator,
  UserPresenceState,
} from "@/types/realtime";

type AppSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

type PresenceEntry = {
  sockets: Set<string>;
  status: "online" | "away";
  lastSeen: Date;
};

const socketGlobals = globalThis as typeof globalThis & {
  __socketServer?: AppSocketServer;
  __presenceEntries?: Map<string, PresenceEntry>;
  __typingEntries?: Map<string, Map<string, TypingIndicator>>;
  __typingTimeouts?: Map<string, NodeJS.Timeout>;
};

function getPresenceEntries() {
  if (!socketGlobals.__presenceEntries) {
    socketGlobals.__presenceEntries = new Map();
  }

  return socketGlobals.__presenceEntries;
}

function getTypingEntries() {
  if (!socketGlobals.__typingEntries) {
    socketGlobals.__typingEntries = new Map();
  }

  return socketGlobals.__typingEntries;
}

function getTypingTimeouts() {
  if (!socketGlobals.__typingTimeouts) {
    socketGlobals.__typingTimeouts = new Map();
  }

  return socketGlobals.__typingTimeouts;
}

function roomForUser(userId: string) {
  return `user:${userId}`;
}

function roomForConversation(conversationId: string) {
  return `conversation:${conversationId}`;
}

function roomForTicket(ticketId: string) {
  return `ticket:${ticketId}`;
}

function buildHeadersFromRequestHeaders(headersObject: Record<string, string | string[] | undefined>) {
  const headers = new Headers();

  Object.entries(headersObject).forEach(([key, value]) => {
    if (typeof value === "undefined") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
      return;
    }

    headers.append(key, value);
  });

  return headers;
}

function toPresenceState(
  userId: string,
  entry: PresenceEntry
): UserPresenceState {
  return {
    user_id: userId,
    status: entry.status,
    last_seen: entry.lastSeen.toISOString(),
    updated_at: entry.lastSeen.toISOString(),
  };
}

function getPresenceSnapshot() {
  return Array.from(getPresenceEntries().entries()).map(([userId, entry]) =>
    toPresenceState(userId, entry)
  );
}

function getTypingUsers(conversationId: string) {
  return Array.from(
    getTypingEntries().get(conversationId)?.values() || []
  ).sort((left, right) =>
    left.updated_at.localeCompare(right.updated_at)
  );
}

function emitTypingState(io: AppSocketServer, conversationId: string) {
  io.to(roomForConversation(conversationId)).emit("chat:typing:state", {
    conversationId,
    typingUsers: getTypingUsers(conversationId),
  });
}

function setTypingState(
  io: AppSocketServer,
  conversationId: string,
  user: SocketSessionUser,
  isTyping: boolean
) {
  const typingEntries = getTypingEntries();
  const typingTimeouts = getTypingTimeouts();
  const timeoutKey = `${conversationId}:${user.id}`;

  if (typingTimeouts.has(timeoutKey)) {
    clearTimeout(typingTimeouts.get(timeoutKey));
    typingTimeouts.delete(timeoutKey);
  }

  if (!isTyping) {
    const conversationTyping = typingEntries.get(conversationId);
    if (conversationTyping) {
      conversationTyping.delete(user.id);
      if (conversationTyping.size === 0) {
        typingEntries.delete(conversationId);
      }
    }

    emitTypingState(io, conversationId);
    return;
  }

  const conversationTyping =
    typingEntries.get(conversationId) || new Map<string, TypingIndicator>();
  conversationTyping.set(user.id, {
    conversation_id: conversationId,
    user_id: user.id,
    user_name: user.name || null,
    updated_at: new Date().toISOString(),
  });
  typingEntries.set(conversationId, conversationTyping);
  emitTypingState(io, conversationId);

  const timeout = setTimeout(() => {
    setTypingState(io, conversationId, user, false);
  }, 5000);

  typingTimeouts.set(timeoutKey, timeout);
}

function clearTypingStateForUser(io: AppSocketServer, userId: string) {
  const typingEntries = getTypingEntries();
  const typingTimeouts = getTypingTimeouts();

  Array.from(typingEntries.entries()).forEach(([conversationId, conversationTyping]) => {
    if (!conversationTyping.has(userId)) {
      return;
    }

    conversationTyping.delete(userId);
    const timeoutKey = `${conversationId}:${userId}`;
    if (typingTimeouts.has(timeoutKey)) {
      clearTimeout(typingTimeouts.get(timeoutKey));
      typingTimeouts.delete(timeoutKey);
    }

    if (conversationTyping.size === 0) {
      typingEntries.delete(conversationId);
    }

    emitTypingState(io, conversationId);
  });
}

async function canAccessTicket(user: SocketSessionUser, ticketId: string) {
  const { request } = await findRequestById(ticketId);
  if (!request) {
    return false;
  }

  if (user.role === "admin" || user.role === "support") {
    return true;
  }

  return request.customerId === user.id;
}

async function getSocketSessionUser(headersObject: Record<string, string | string[] | undefined>) {
  const session = await auth.api.getSession({
    headers: buildHeadersFromRequestHeaders(headersObject),
  });

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name || "User",
    email: session.user.email || undefined,
    role: (session.user as { role?: string }).role,
  } satisfies SocketSessionUser;
}

export function getSocketServer() {
  return socketGlobals.__socketServer || null;
}

export function initializeSocketServer(httpServer: HttpServer) {
  if (socketGlobals.__socketServer) {
    return socketGlobals.__socketServer;
  }

  const io: AppSocketServer = new Server(httpServer, {
    path: "/socket.io",
    serveClient: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || true,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const user = await getSocketSessionUser(
        socket.request.headers as Record<string, string | string[] | undefined>
      );

      if (!user) {
        next(new Error("Unauthorized"));
        return;
      }

      socket.data.user = user;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    const presenceEntries = getPresenceEntries();
    const existing = presenceEntries.get(user.id) || {
      sockets: new Set<string>(),
      status: "online" as const,
      lastSeen: new Date(),
    };

    existing.sockets.add(socket.id);
    existing.status = "online";
    existing.lastSeen = new Date();
    presenceEntries.set(user.id, existing);

    socket.join(roomForUser(user.id));
    socket.emit("presence:snapshot", getPresenceSnapshot());
    io.emit("presence:updated", toPresenceState(user.id, existing));

    socket.on("chat:conversation:join", async ({ conversationId }) => {
      const conversation = await ensureConversationParticipant(
        conversationId,
        user.id
      );

      if (!conversation) {
        return;
      }

      socket.join(roomForConversation(conversationId));
      socket.emit("chat:typing:state", {
        conversationId,
        typingUsers: getTypingUsers(conversationId),
      });
    });

    socket.on("chat:conversation:leave", ({ conversationId }) => {
      socket.leave(roomForConversation(conversationId));
      setTypingState(io, conversationId, user, false);
    });

    socket.on("chat:typing:set", async ({ conversationId, isTyping }) => {
      const conversation = await ensureConversationParticipant(
        conversationId,
        user.id
      );

      if (!conversation) {
        return;
      }

      socket.join(roomForConversation(conversationId));
      setTypingState(io, conversationId, user, isTyping);
    });

    socket.on("ticket:join", async ({ ticketId }) => {
      if (await canAccessTicket(user, ticketId)) {
        socket.join(roomForTicket(ticketId));
      }
    });

    socket.on("ticket:leave", ({ ticketId }) => {
      socket.leave(roomForTicket(ticketId));
    });

    socket.on("disconnect", () => {
      clearTypingStateForUser(io, user.id);

      const current = presenceEntries.get(user.id);
      if (!current) {
        return;
      }

      current.sockets.delete(socket.id);
      current.lastSeen = new Date();

      if (current.sockets.size === 0) {
        presenceEntries.delete(user.id);
        io.emit("presence:updated", {
          user_id: user.id,
          status: "offline",
          last_seen: current.lastSeen.toISOString(),
          updated_at: current.lastSeen.toISOString(),
        });
        return;
      }

      presenceEntries.set(user.id, current);
      io.emit("presence:updated", toPresenceState(user.id, current));
    });
  });

  socketGlobals.__socketServer = io;
  return io;
}

export async function emitConversationSummaryToParticipants(conversationId: string) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  const participantIds = await getParticipantIdsForConversation(conversationId);
  await Promise.all(
    participantIds.map(async (userId) => {
      const summary = await getConversationSummaryForUser(conversationId, userId);
      if (summary) {
        io.to(roomForUser(userId)).emit("chat:conversation:upsert", summary);
      }
    })
  );
}

export function emitConversationRemovedToParticipants(
  participantIds: string[],
  conversationId: string
) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  participantIds.forEach((userId) => {
    io.to(roomForUser(userId)).emit("chat:conversation:removed", {
      conversationId,
    });
  });
}

export function emitMessageCreated(message: Message) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForConversation(message.conversation_id)).emit(
    "chat:message:created",
    message
  );
}

export function emitMessageUpdated(message: Message) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForConversation(message.conversation_id)).emit(
    "chat:message:updated",
    message
  );
}

export function emitMessageDeleted(conversationId: string, messageId: string) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForConversation(conversationId)).emit("chat:message:deleted", {
    conversationId,
    messageId,
  });
}

export function emitMessagesRead(
  conversationId: string,
  messageIds: string[],
  userId: string
) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForConversation(conversationId)).emit("chat:messages:read", {
    conversationId,
    messageIds,
    userId,
    readAt: new Date().toISOString(),
  });
}

export function emitNotificationCreated(
  userId: string,
  notification: ClientNotification
) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForUser(userId)).emit("notification:created", notification);
}

export function emitNotificationUpdated(
  userId: string,
  notification: ClientNotification
) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForUser(userId)).emit("notification:updated", notification);
}

export function emitNotificationDeleted(userId: string, notificationIds: string[]) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForUser(userId)).emit("notification:deleted", { notificationIds });
}

export function emitCommentCreated(ticketId: string, comment: SerializedComment) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForTicket(ticketId)).emit("comment:created", {
    ticketId,
    comment,
  });
}

export function emitCommentUpdated(ticketId: string, comment: SerializedComment) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForTicket(ticketId)).emit("comment:updated", {
    ticketId,
    comment,
  });
}

export function emitCommentDeleted(ticketId: string, commentId: string) {
  const io = getSocketServer();
  if (!io) {
    return;
  }

  io.to(roomForTicket(ticketId)).emit("comment:deleted", {
    ticketId,
    commentId,
  });
}
