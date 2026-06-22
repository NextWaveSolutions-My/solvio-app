"use client";

import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { NotificationList } from "./notification-list";

interface NotificationsClientProps {
  userId: string;
  basePath?: string;
  clickBehavior?: "detail" | "direct";
}

export function NotificationsClient({
  userId,
  basePath,
  clickBehavior,
}: NotificationsClientProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useRealtimeNotifications(userId);

  return (
    <NotificationList
      notifications={notifications}
      loading={loading}
      unreadCount={unreadCount}
      onMarkAsRead={markAsRead}
      onMarkAllAsRead={markAllAsRead}
      basePath={basePath}
      clickBehavior={clickBehavior}
    />
  );
}
