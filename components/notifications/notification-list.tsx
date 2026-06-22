"use client";

import { useState } from "react";
import { NotificationItem } from "./notification-item";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCheck, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClientNotification } from "@/types/realtime";

interface NotificationListProps {
  notifications: ClientNotification[];
  loading: boolean;
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  basePath?: string;
  clickBehavior?: "detail" | "direct";
}

export function NotificationList({
  notifications,
  loading,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  basePath,
  clickBehavior = "detail",
}: NotificationListProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${
                  unreadCount === 1 ? "" : "s"
                }`
              : "You're all caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkAllAsRead}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as "all" | "unread")}
      >
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Bell className="h-4 w-4" />
            All
            <span className="ml-1 text-xs text-muted-foreground">
              ({notifications.length})
            </span>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2">
            <Filter className="h-4 w-4" />
            Unread
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-medium">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {/* Loading State */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-lg border"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && filteredNotifications.length === 0 && (
            <div className="py-16 text-center">
              <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {filter === "unread"
                  ? "No unread notifications"
                  : "No notifications yet"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filter === "unread"
                  ? "You've read all your notifications"
                  : "When you receive notifications, they'll appear here"}
              </p>
            </div>
          )}

          {/* Notifications List */}
          {!loading && filteredNotifications.length > 0 && (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "border rounded-lg transition-colors",
                    !notification.read && "border-blue-200 dark:border-blue-900"
                  )}
                >
                  <NotificationItem
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                    basePath={basePath}
                    clickBehavior={clickBehavior}
                  />
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
