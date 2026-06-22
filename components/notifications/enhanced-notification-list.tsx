"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Ticket,
  CheckCircle,
  UserPlus,
  Calendar,
  CalendarX,
  Download,
  Wrench,
  MessageCircle,
  Trash2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Notification } from "@/types";
import {
  NotificationFilters,
  type NotificationFiltersState,
} from "./notification-filters";
import {
  bulkMarkAsRead,
  bulkMarkAsUnread,
  bulkDeleteNotifications,
  deleteAllReadNotifications,
  getNotifications,
  getNotificationStats,
  markNotificationAsRead,
} from "@/lib/notifications";

// Type for notification with string _id (converted from ObjectId)
type NotificationWithStringId = Omit<Notification, "_id"> & { _id: string };

interface EnhancedNotificationListProps {
  userId: string;
  basePath: string; // e.g., "/dashboard/notifications" or "/admin/notifications"
}

const notificationIcons: Record<string, LucideIcon> = {
  new_message: MessageSquare,
  new_ticket: Ticket,
  ticket_status: CheckCircle,
  ticket_assignment: UserPlus,
  meeting_scheduled: Calendar,
  meeting_cancelled: CalendarX,
  installation_status: Download,
  customization_status: Wrench,
  comment: MessageCircle,
};

const notificationColors: Record<string, string> = {
  new_message: "text-blue-500",
  new_ticket: "text-purple-500",
  ticket_status: "text-green-500",
  ticket_assignment: "text-orange-500",
  meeting_scheduled: "text-indigo-500",
  meeting_cancelled: "text-red-500",
  installation_status: "text-cyan-500",
  customization_status: "text-pink-500",
  comment: "text-teal-500",
};

export function EnhancedNotificationList({
  userId,
  basePath,
}: EnhancedNotificationListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // State
  const [notifications, setNotifications] = useState<
    NotificationWithStringId[]
  >([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [stats, setStats] = useState({ total: 0, unread: 0, read: 0 });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Filters
  const [filters, setFilters] = useState<NotificationFiltersState>({
    search: searchParams.get("search") || "",
    type:
      (searchParams.get("type") as NotificationFiltersState["type"]) || "all",
    read:
      (searchParams.get("read") as NotificationFiltersState["read"]) || "all",
    dateRange: "all",
    sortBy: "date",
    sortOrder: "desc",
  });

  // Load notifications
  const loadNotifications = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const [notificationResult, statsResult] = await Promise.all([
        getNotifications({
          userId,
          page,
          limit: pagination.limit,
          type: filters.type !== "all" ? filters.type : undefined,
          read: filters.read === "all" ? undefined : filters.read === "read",
          search: filters.search || undefined,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        }),
        getNotificationStats(userId),
      ]);

      if (notificationResult.success && notificationResult.notifications) {
        setNotifications(
          notificationResult.notifications as NotificationWithStringId[]
        );
        setPagination(notificationResult.pagination!);
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount and filter changes
  useEffect(() => {
    loadNotifications(1);
  }, [filters]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n._id.toString())));
    }
  };

  // Bulk actions
  const handleBulkMarkAsRead = async () => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const result = await bulkMarkAsRead(Array.from(selectedIds), userId);
      if (result.success) {
        toast.success(`Marked ${result.count} notifications as read`);
        setSelectedIds(new Set());
        loadNotifications(pagination.page);
      } else {
        toast.error("Failed to mark notifications as read");
      }
    });
  };

  const handleBulkMarkAsUnread = async () => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const result = await bulkMarkAsUnread(Array.from(selectedIds), userId);
      if (result.success) {
        toast.success(`Marked ${result.count} notifications as unread`);
        setSelectedIds(new Set());
        loadNotifications(pagination.page);
      } else {
        toast.error("Failed to mark notifications as unread");
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    startTransition(async () => {
      const result = await bulkDeleteNotifications(
        Array.from(selectedIds),
        userId
      );
      if (result.success) {
        toast.success(`Deleted ${result.count} notifications`);
        setSelectedIds(new Set());
        loadNotifications(pagination.page);
      } else {
        toast.error("Failed to delete notifications");
      }
    });
  };

  const handleDeleteAllRead = async () => {
    startTransition(async () => {
      const result = await deleteAllReadNotifications(userId);
      if (result.success) {
        toast.success(`Deleted ${result.count} read notifications`);
        setShowDeleteAllDialog(false);
        loadNotifications(1);
      } else {
        toast.error("Failed to delete read notifications");
      }
    });
  };

  // Navigation
  const handleNotificationClick = async (
    notification: NotificationWithStringId
  ) => {
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === notification._id ? { ...n, read: true } : n))
      );
      await markNotificationAsRead(notification._id, userId);
    }
    router.push(`${basePath}/${notification._id}`);
  };

  const handlePageChange = (newPage: number) => {
    loadNotifications(newPage);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header with Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              {stats.unread > 0 ? (
                <>
                  You have{" "}
                  <span className="font-semibold text-primary">
                    {stats.unread}
                  </span>{" "}
                  unread notification{stats.unread !== 1 ? "s" : ""} out of{" "}
                  {stats.total} total
                </>
              ) : (
                <>
                  You&apos;re all caught up! ({stats.total} total notifications)
                </>
              )}
            </p>
          </div>
          {stats.read > 0 && (
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllDialog(true)}
              disabled={isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Read
            </Button>
          )}
        </div>

        {/* Filters */}
        <NotificationFilters filters={filters} onFiltersChange={setFilters} />

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <Card className="bg-muted/50">
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedIds.size} notification
                  {selectedIds.size !== 1 ? "s" : ""} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkMarkAsRead}
                    disabled={isPending}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Mark Read
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkMarkAsUnread}
                    disabled={isPending}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Mark Unread
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDelete}
                    disabled={isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No notifications found
              </h3>
              <p className="text-muted-foreground">
                {filters.search ||
                filters.type !== "all" ||
                filters.read !== "all"
                  ? "Try adjusting your filters"
                  : "You don't have any notifications yet"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All Checkbox */}
            <div className="flex items-center gap-2 px-1">
              <Checkbox
                checked={
                  selectedIds.size === notifications.length &&
                  notifications.length > 0
                }
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                Select all on this page
              </span>
            </div>

            {/* Notification Items */}
            <div className="space-y-3">
              {notifications.map((notification) => {
                const Icon =
                  notificationIcons[notification.type] || MessageCircle;
                const iconColor =
                  notificationColors[notification.type] || "text-gray-500";
                const isSelected = selectedIds.has(notification._id.toString());

                return (
                  <Card
                    key={notification._id.toString()}
                    className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                      !notification.read ? "border-l-4 border-l-primary" : ""
                    } ${isSelected ? "bg-muted/50" : ""}`}
                  >
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() =>
                            toggleSelect(notification._id.toString())
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div
                          className="flex-1 flex items-start gap-4"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div
                            className={`rounded-full p-2 bg-muted ${iconColor}`}
                          >
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm mb-1 truncate">
                                  {notification.title}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {notification.body}
                                </p>
                              </div>
                              {!notification.read && (
                                <Badge variant="default" className="shrink-0">
                                  New
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(
                                new Date(notification.sentAt),
                                {
                                  addSuffix: true,
                                }
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} notifications
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1 || isPending}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={
                      pagination.page === pagination.totalPages || isPending
                    }
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete All Read Dialog */}
      <AlertDialog
        open={showDeleteAllDialog}
        onOpenChange={setShowDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Read Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {stats.read} read notifications.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllRead}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete All Read"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
