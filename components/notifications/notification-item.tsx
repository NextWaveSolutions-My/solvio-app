"use client";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import type { ClientNotification } from "@/types/realtime";
import {
  Bell,
  MessageSquare,
  Ticket,
  CheckCircle,
  UserPlus,
  Calendar,
  CalendarX,
  Download,
  Wrench,
  MessageCircle,
  Paperclip,
} from "lucide-react";

interface NotificationItemProps {
  notification: ClientNotification;
  onMarkAsRead?: (id: string) => void;
  onClick?: () => void;
  basePath?: string; // e.g., "/dashboard/notifications", "/admin/notifications", etc.
  clickBehavior?: "detail" | "direct"; // User preference for click behavior
}

const notificationIcons: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  new_message: MessageSquare,
  new_ticket: Ticket,
  ticket_status: CheckCircle,
  ticket_assignment: UserPlus,
  meeting_scheduled: Calendar,
  meeting_reminder: Calendar,
  meeting_cancelled: CalendarX,
  installation_status: Download,
  customization_status: Wrench,
  comment: MessageCircle,
  attachment: Paperclip,
};

const notificationColors: Record<string, string> = {
  new_message: "text-blue-600 bg-blue-50 dark:bg-blue-950",
  new_ticket: "text-purple-600 bg-purple-50 dark:bg-purple-950",
  ticket_status: "text-green-600 bg-green-50 dark:bg-green-950",
  ticket_assignment: "text-orange-600 bg-orange-50 dark:bg-orange-950",
  meeting_scheduled: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950",
  meeting_reminder: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950",
  meeting_cancelled: "text-red-600 bg-red-50 dark:bg-red-950",
  installation_status: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950",
  customization_status: "text-pink-600 bg-pink-50 dark:bg-pink-950",
  comment: "text-teal-600 bg-teal-50 dark:bg-teal-950",
  attachment: "text-cyan-700 bg-cyan-50 dark:bg-cyan-950",
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
  basePath,
  clickBehavior = "detail",
}: NotificationItemProps) {
  const router = useRouter();
  const Icon = notificationIcons[notification.type] || Bell;
  const colorClass =
    notificationColors[notification.type] ||
    "text-gray-600 bg-gray-50 dark:bg-gray-950";

  const handleClick = async () => {
    const mongoNotificationId =
      typeof notification.data?.notificationId === "string"
        ? notification.data.notificationId
        : notification.id;

    // Always prefer the notification detail page when we have a Mongo notification ID.
    if (basePath && mongoNotificationId) {
      if (!notification.read && onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
      router.push(`${basePath}/${mongoNotificationId}`);
    } else if (
      clickBehavior === "direct" &&
      typeof notification.data?.url === "string"
    ) {
      // When no notification ID is available and user prefers direct, go to the related resource.
      if (!notification.read && onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
      router.push(notification.data.url);
    } else if (basePath) {
      // Fallback: go to the notifications page.
      router.push(basePath);
    }

    // Call custom onClick handler
    if (onClick) {
      onClick();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-start gap-3 rounded-lg p-2.5 cursor-pointer transition-colors",
        "hover:bg-muted/60",
        !notification.read && "bg-blue-50/60 dark:bg-blue-950/20"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          colorClass
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "line-clamp-1 text-sm",
              notification.read ? "font-medium" : "font-semibold"
            )}
          >
            {notification.title}
          </p>
          {!notification.read && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">
          {notification.body}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/80">{timeAgo}</p>
      </div>
    </div>
  );
}
