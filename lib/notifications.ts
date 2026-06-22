/**
 * Notification Service Layer
 *
 * Centralized service for creating and managing notifications.
 * MongoDB is the durable store and Socket.IO fans out realtime updates.
 */

"use server";

import { ObjectId } from "mongodb";

import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth-utils";
import { serializeNotificationForClient } from "@/lib/notification-client";
import { sendPushNotificationToUser } from "@/lib/push/server";
import {
  emitNotificationCreated,
  emitNotificationDeleted,
  emitNotificationUpdated,
} from "@/lib/socket/server";
import type { NotificationType } from "@/types";
import type { User, UserPreferences } from "@/types";

export type NotificationDocument = {
  _id: ObjectId;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: CreateNotificationParams["data"];
  read: boolean;
  sentAt: Date;
  readAt?: Date | null;
};

async function requireNotificationUser(userId: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  if (session.user.id !== userId) {
    throw new Error("Forbidden");
  }
  return session;
}

function getSupportAllowedNotificationTypes(): NotificationType[] {
  return [
    "ticket_assignment",
    "ticket_status",
    "comment",
    "attachment",
    "meeting_scheduled",
    "meeting_updated",
    "meeting_cancelled",
    "meeting_reminder",
    "new_message",
    "ticket_mention",
    "installation_status",
    "customization_status",
  ];
}

type NotificationChannels = NonNullable<
  UserPreferences["notifications"]
>["channels"];
export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    ticketId?: string;
    commentId?: string;
    meetingId?: string;
    conversationId?: string;
    messageId?: string;
    installationId?: string;
    customizationId?: string;
    url: string;
    [key: string]: unknown;
  };
}

interface NotificationAuditEvent {
  eventType: NotificationType;
  recipientId: string;
  title: string;
  body: string;
  channelsAttempted: ("in_app" | "email")[];
  results: {
    inApp?: { success: boolean; notificationId?: string; error?: string };
    email?: { success: boolean; messageId?: string; error?: string };
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

function resolveChannelPreference(
  prefs?: NotificationChannels,
  type?: NotificationType
) {
  const def = prefs?.default ?? "both";
  switch (type) {
    case "comment":
      return prefs?.comment ?? def;
    case "meeting_scheduled":
      return prefs?.meetingScheduled ?? def;
    case "meeting_updated":
      return prefs?.meetingUpdated ?? def;
    case "attachment":
      return prefs?.attachment ?? def;
    default:
      return def;
  }
}

/**
 * Dispatch notification honoring user preferences and audit logging
 */
export async function dispatchUserNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: CreateNotificationParams["data"];
  email?: { to?: string; subject: string; html: string };
  metadata?: Record<string, unknown>;
  /**
   * Always create the in-app notification regardless of the user's channel
   * preference. Used for events the recipient must see in their panel (e.g. a
   * customer replying on a ticket), while email still honors preferences.
   */
  forceInApp?: boolean;
}) {
  const users = await getCollection<User>("user");
  const user = await users.findOne({ id: params.userId } as unknown as User);
  const notifPrefs = (user?.preferences as UserPreferences | undefined)
    ?.notifications;
  const channelsPref = resolveChannelPreference(
    notifPrefs &&
      (notifPrefs as Record<string, unknown>).hasOwnProperty("channels")
      ? (
          notifPrefs as {
            channels?: NotificationChannels;
          }
        ).channels
      : undefined,
    params.type
  );

  const attemptInApp =
    params.forceInApp ||
    channelsPref === "both" ||
    channelsPref === "in_app";
  const attemptEmail = channelsPref === "both" || channelsPref === "email";

  const results: NotificationAuditEvent["results"] = {};

  if (attemptInApp) {
    const res = await createNotification({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data,
    });
    results.inApp = {
      success: res.success,
      notificationId: res.success ? res.id : undefined,
      error: res.success ? undefined : res.error,
    };
  }

  if (attemptEmail && params.email) {
    try {
      const { sendEmail, isEmailServiceEnabled } = await import("@/lib/email");
      const { getSystemSettings } = await import("@/lib/settings-utils");
      const settings = await getSystemSettings();
      const to =
        params.email?.to || (user?.email ? String(user.email) : undefined);
      if (!isEmailServiceEnabled(settings)) {
        results.email = {
          success: false,
          error: "Email notifications disabled",
        };
      } else if (to) {
        const sent = await sendEmail({
          to,
          subject: params.email.subject,
          html: params.email.html,
        });
        results.email = {
          success: !!sent.success,
          messageId: sent.success ? sent.messageId : undefined,
          error: sent.success
            ? undefined
            : typeof sent.error === "object" && sent.error
            ? (sent.error as Error).message
            : String(sent.error),
        };
      } else {
        results.email = {
          success: false,
          error: "Recipient email missing",
        };
      }
    } catch (e) {
      results.email = {
        success: false,
        error: (e as Error).message,
      };
    }
  }

  const audits = await getCollection<NotificationAuditEvent>(
    "notification_events"
  );
  await audits.insertOne({
    eventType: params.type,
    recipientId: params.userId,
    title: params.title,
    body: params.body,
    channelsAttempted: [
      ...(attemptInApp ? ["in_app"] : []),
      ...(attemptEmail ? ["email"] : []),
    ],
    results,
    metadata: params.metadata,
    createdAt: new Date(),
  } as unknown as NotificationAuditEvent);

  return results;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    const notificationsCollection =
      await getCollection<NotificationDocument>("notifications");
    const notification: NotificationDocument = {
      _id: new ObjectId(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data || { url: "" },
      read: false,
      sentAt: new Date(),
    };

    const result = await notificationsCollection.insertOne(notification);
    const serializedNotification = serializeNotificationForClient(notification);

    emitNotificationCreated(params.userId, serializedNotification);

    const pushResult = await sendPushNotificationToUser(params.userId, {
      title: params.title,
      body: params.body,
      notificationId: result.insertedId.toString(),
      data:
        notification.data && typeof notification.data === "object"
          ? (notification.data as Record<string, unknown>)
          : null,
    });

    if (!pushResult.success && !pushResult.skipped) {
      console.error("Failed to fan out web push notification:", pushResult);
    }

    return {
      success: true,
      id: result.insertedId.toString(),
    };
  } catch (error) {
    console.error("Failed to create notification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create notifications for multiple users
 * Useful for notifying all admins/support staff
 */
export async function createBulkNotifications(
  userIds: string[],
  params: Omit<CreateNotificationParams, "userId">
) {
  try {
    const results = await Promise.allSettled(
      userIds.map((userId) => createNotification({ ...params, userId }))
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return {
      success: true,
      total: userIds.length,
      successful,
      failed,
    };
  } catch (error) {
    console.error("Failed to create bulk notifications:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(
  notificationId: string,
  userId: string
) {
  try {
    await requireNotificationUser(userId);
    const notificationsCollection =
      await getCollection<NotificationDocument>("notifications");
    const result = await notificationsCollection.updateOne(
      { _id: new ObjectId(notificationId), userId },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return { success: false };
    }

    const updated = await notificationsCollection.findOne({
      _id: new ObjectId(notificationId),
      userId,
    });
    if (updated) {
      emitNotificationUpdated(userId, serializeNotificationForClient(updated));
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return { success: false };
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: string) {
  try {
    await requireNotificationUser(userId);
    const notificationsCollection =
      await getCollection<NotificationDocument>("notifications");
    const unreadNotifications = await notificationsCollection
      .find({ userId, read: false })
      .toArray();
    const result = await notificationsCollection.updateMany(
      { userId, read: false },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    unreadNotifications.forEach((notification) => {
      emitNotificationUpdated(userId, {
        ...serializeNotificationForClient(notification),
        read: true,
        read_at: new Date().toISOString(),
      });
    });

    return {
      success: true,
      count: result.modifiedCount,
    };
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return { success: false };
  }
}

/**
 * Mark a notification as unread
 */
export async function markNotificationAsUnread(
  notificationId: string,
  userId: string
) {
  try {
    await requireNotificationUser(userId);
    const notificationsCollection =
      await getCollection<NotificationDocument>("notifications");
    const result = await notificationsCollection.updateOne(
      { _id: new ObjectId(notificationId), userId },
      {
        $set: {
          read: false,
          readAt: null,
        },
      }
    );

    if (result.modifiedCount === 0) {
      return { success: false };
    }

    const updated = await notificationsCollection.findOne({
      _id: new ObjectId(notificationId),
      userId,
    });
    if (updated) {
      emitNotificationUpdated(userId, serializeNotificationForClient(updated));
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to mark notification as unread:", error);
    return { success: false };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
) {
  try {
    await requireNotificationUser(userId);
    const notificationsCollection =
      await getCollection<NotificationDocument>("notifications");
    const result = await notificationsCollection.deleteOne({
      _id: new ObjectId(notificationId),
      userId,
    });

    if (result.deletedCount === 0) {
      return { success: false };
    }

    emitNotificationDeleted(userId, [notificationId]);

    return { success: true };
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return { success: false };
  }
}

/**
 * Bulk mark notifications as read
 */
export async function bulkMarkAsRead(
  notificationIds: string[],
  userId: string
) {
  try {
    await requireNotificationUser(userId);
    const notificationsCollection =
      await getCollection<NotificationDocument>("notifications");
    const targets = await notificationsCollection
      .find({
        _id: { $in: notificationIds.map((id) => new ObjectId(id)) },
        userId,
      })
      .toArray();
    const result = await notificationsCollection.updateMany(
      {
        _id: { $in: notificationIds.map((id) => new ObjectId(id)) },
        userId,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      }
    );

    const readAt = new Date().toISOString();
    targets.forEach((notification) => {
      emitNotificationUpdated(userId, {
        ...serializeNotificationForClient(notification),
        read: true,
        read_at: readAt,
      });
    });

    return {
      success: true,
      count: result.modifiedCount,
    };
  } catch (error) {
    console.error("Failed to bulk mark as read:", error);
    return { success: false };
  }
}

/**
 * Bulk mark notifications as unread
 */
export async function bulkMarkAsUnread(
  notificationIds: string[],
  userId: string
) {
  try {
    await requireNotificationUser(userId);
    const notificationsCollection =
      await getCollection<NotificationDocument>("notifications");
    const targets = await notificationsCollection
      .find({
        _id: { $in: notificationIds.map((id) => new ObjectId(id)) },
        userId,
      })
      .toArray();
    const result = await notificationsCollection.updateMany(
      {
        _id: { $in: notificationIds.map((id) => new ObjectId(id)) },
        userId,
      },
      {
        $set: {
          read: false,
          readAt: null,
        },
      }
    );

    targets.forEach((notification) => {
      emitNotificationUpdated(userId, {
        ...serializeNotificationForClient(notification),
        read: false,
        read_at: null,
      });
    });

    return {
      success: true,
      count: result.modifiedCount,
    };
  } catch (error) {
    console.error("Failed to bulk mark as unread:", error);
    return { success: false };
  }
}

/**
 * Bulk delete notifications
 */
export async function bulkDeleteNotifications(
  notificationIds: string[],
  userId: string
) {
  try {
    await requireNotificationUser(userId);
    const notificationsCollection =
      await getCollection<NotificationDocument>("notifications");
    const result = await notificationsCollection.deleteMany({
      _id: { $in: notificationIds.map((id) => new ObjectId(id)) },
      userId,
    });

    emitNotificationDeleted(userId, notificationIds);

    return {
      success: true,
      count: result.deletedCount,
    };
  } catch (error) {
    console.error("Failed to bulk delete notifications:", error);
    return { success: false };
  }
}

/**
 * Delete all read notifications for a user
 */
export async function deleteAllReadNotifications(userId: string) {
  try {
    await requireNotificationUser(userId);
    const notificationsCollection =
      await getCollection<NotificationDocument>("notifications");
    const deletedNotifications = await notificationsCollection
      .find({ userId, read: true })
      .toArray();
    const result = await notificationsCollection.deleteMany({
      userId,
      read: true,
    });

    if (deletedNotifications.length > 0) {
      emitNotificationDeleted(
        userId,
        deletedNotifications.map((notification) =>
          notification._id.toString()
        )
      );
    }

    return {
      success: true,
      count: result.deletedCount,
    };
  } catch (error) {
    console.error("Failed to delete all read notifications:", error);
    return { success: false };
  }
}
/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(userId: string) {
  try {
    const session = await requireNotificationUser(userId);
    const notificationsCollection = await getCollection("notifications");

    const role = (session.user as { role?: string })?.role ?? "customer";
    const baseQuery: Record<string, unknown> = { userId };
    if (role === "support") {
      baseQuery.type = { $in: getSupportAllowedNotificationTypes() };
    }

    const [total, unread] = await Promise.all([
      notificationsCollection.countDocuments(baseQuery),
      notificationsCollection.countDocuments({ ...baseQuery, read: false }),
    ]);

    return {
      success: true,
      stats: {
        total,
        unread,
        read: total - unread,
      },
    };
  } catch (error) {
    console.error("Failed to get notification stats:", error);
    return { success: false };
  }
}

/**
 * Get a single notification by ID
 */
export async function getNotificationById(
  notificationId: string,
  userId: string
) {
  try {
    await requireNotificationUser(userId);
    const { ObjectId } = await import("mongodb");
    const notificationsCollection = await getCollection("notifications");

    const notification = await notificationsCollection.findOne({
      _id: new ObjectId(notificationId),
      userId,
    });

    if (!notification) {
      return { success: false, error: "Notification not found" };
    }

    return {
      success: true,
      notification: {
        ...notification,
        _id: notification._id.toString(),
      },
    };
  } catch (error) {
    console.error("Failed to get notification:", error);
    return { success: false, error: "Failed to get notification" };
  }
}

export interface GetNotificationsParams {
  userId: string;
  page?: number;
  limit?: number;
  type?: NotificationType | NotificationType[];
  read?: boolean;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: "date" | "read";
  sortOrder?: "asc" | "desc";
}

type NotificationQuery = {
  userId: string;
  type?: NotificationType | { $in: NotificationType[] };
  read?: boolean;
  sentAt?: { $gte?: Date; $lte?: Date };
  $or?: Array<
    | { title: { $regex: string; $options?: string } }
    | { body: { $regex: string; $options?: string } }
  >;
};

/**
 * Get notifications with pagination, filtering, and search
 */
export async function getNotifications(params: GetNotificationsParams) {
  try {
    const {
      userId,
      page = 1,
      limit = 20,
      type,
      read,
      search,
      dateFrom,
      dateTo,
      sortBy = "date",
      sortOrder = "desc",
    } = params;

    const session = await requireNotificationUser(userId);
    const role = (session.user as { role?: string })?.role ?? "customer";
    const supportAllowedTypes =
      role === "support" ? getSupportAllowedNotificationTypes() : null;

    const notificationsCollection = await getCollection("notifications");

    // Build query
    const query: NotificationQuery = { userId };

    // Filter by type
    if (type) {
      if (Array.isArray(type)) {
        const typeList = supportAllowedTypes
          ? type.filter((t) => supportAllowedTypes.includes(t))
          : type;
        query.type = { $in: typeList };
      } else {
        if (supportAllowedTypes) {
          query.type = supportAllowedTypes.includes(type)
            ? type
            : { $in: [] };
        } else {
          query.type = type;
        }
      }
    } else if (supportAllowedTypes) {
      query.type = { $in: supportAllowedTypes };
    }

    // Filter by read status
    if (read !== undefined) {
      query.read = read;
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      query.sentAt = {};
      if (dateFrom) {
        query.sentAt.$gte = dateFrom;
      }
      if (dateTo) {
        query.sentAt.$lte = dateTo;
      }
    }

    // Search in title and body
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { body: { $regex: search, $options: "i" } },
      ];
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    if (sortBy === "date") {
      sort.sentAt = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "read") {
      sort.read = sortOrder === "asc" ? 1 : -1;
      sort.sentAt = -1; // Secondary sort by date
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query
    const [notifications, total] = await Promise.all([
      notificationsCollection
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      notificationsCollection.countDocuments(query),
    ]);

    // Serialize notifications
    const serializedNotifications = notifications.map((n) => ({
      ...n,
      _id: n._id.toString(),
    }));

    return {
      success: true,
      notifications: serializedNotifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  } catch (error) {
    console.error("Failed to get notifications:", error);
    return {
      success: false,
      error: "Failed to get notifications",
    };
  }
}
