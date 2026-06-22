"use server";

import { requireAuth } from "@/lib/auth-utils";
import { getCollection } from "@/lib/db";
import {
  serializeNotificationForClient,
  type StoredNotification,
} from "@/lib/notification-client";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/lib/notifications";
import type { ClientNotification } from "@/types/realtime";

export async function getBellNotifications(limit = 50) {
  const session = await requireAuth();
  const userId = session.user.id;

  const notificationsCollection = await getCollection<StoredNotification>(
    "notifications"
  );
  const notifications = await notificationsCollection
    .find({ userId })
    .sort({ sentAt: -1 })
    .limit(limit)
    .toArray();

  const mapped: ClientNotification[] = notifications.map((notification) =>
    serializeNotificationForClient(notification)
  );
  const unreadCount = mapped.filter((n) => !n.read).length;

  return { success: true as const, notifications: mapped, unreadCount };
}

export async function markBellNotificationAsRead(notificationId: string) {
  const session = await requireAuth();
  const userId = session.user.id;

  const result = await markNotificationAsRead(notificationId, userId);
  return { success: Boolean(result.success) };
}

export async function markAllBellNotificationsAsRead() {
  const session = await requireAuth();
  const userId = session.user.id;

  const result = await markAllNotificationsAsRead(userId);
  return {
    success: Boolean(result.success),
    count: "count" in result ? result.count ?? 0 : 0,
  };
}
