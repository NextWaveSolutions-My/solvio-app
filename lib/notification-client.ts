import type { ClientNotification } from "@/types/realtime";
import type { NotificationType } from "@/types";

export type StoredNotification = {
  _id: { toString(): string } | string;
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read?: boolean;
  sentAt: Date | string;
  readAt?: Date | string | null;
};

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? new Date(value).toISOString() : value.toISOString();
}

export function serializeNotificationForClient(
  notification: StoredNotification
): ClientNotification {
  const id =
    typeof notification._id === "string"
      ? notification._id
      : notification._id.toString();

  return {
    id,
    user_id: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: {
      ...(notification.data || {}),
      notificationId: id,
      url:
        typeof notification.data?.url === "string" ? notification.data.url : "",
    },
    read: Boolean(notification.read),
    created_at: toIsoString(notification.sentAt) || new Date().toISOString(),
    read_at: toIsoString(notification.readAt),
  };
}
