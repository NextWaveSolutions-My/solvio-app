"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  markNotificationAsRead,
  markNotificationAsUnread,
  deleteNotification,
} from "@/lib/notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NotificationWithStringId = Omit<Notification, "_id"> & { _id: string };

interface NotificationDetailProps {
  notification: NotificationWithStringId;
  backUrl: string;
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

export function NotificationDetail({
  notification,
  backUrl,
}: NotificationDetailProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRead, setIsRead] = useState(notification.read);

  const Icon = notificationIcons[notification.type] || MessageCircle;
  const iconColor = notificationColors[notification.type] || "text-gray-500";

  const handleToggleRead = async () => {
    setIsLoading(true);
    try {
      const result = isRead
        ? await markNotificationAsUnread(notification._id, notification.userId)
        : await markNotificationAsRead(notification._id, notification.userId);

      if (result.success) {
        setIsRead(!isRead);
        toast.success(isRead ? "Marked as unread" : "Marked as read");
        router.refresh();
      } else {
        toast.error("Failed to update notification");
      }
    } catch (error) {
      toast.error("Failed to update notification");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteNotification(
        notification._id,
        notification.userId
      );

      if (result.success) {
        toast.success("Notification deleted");
        router.push(backUrl);
        router.refresh();
      } else {
        toast.error("Failed to delete notification");
      }
    } catch (error) {
      toast.error("Failed to delete notification");
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleNavigateToResource = () => {
    if (notification.data?.url) {
      router.push(notification.data.url);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function autoMark() {
      if (!isRead) {
        const result = await markNotificationAsRead(
          notification._id,
          notification.userId
        );
        if (!cancelled && result.success) {
          setIsRead(true);
          router.refresh();
        }
      }
    }
    autoMark();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(backUrl)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notifications
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleRead}
              disabled={isLoading}
            >
              {isRead ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Mark as Unread
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Mark as Read
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className={`rounded-full p-3 bg-muted ${iconColor}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {notification.title}
                  </CardTitle>
                  {!isRead && <Badge variant="default">Unread</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.sentAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Body */}
            <div>
              <h3 className="text-sm font-medium mb-2">Message</h3>
              <p className="text-base">{notification.body}</p>
            </div>

            <Separator />

            {/* Metadata */}
            {notification.data && Object.keys(notification.data).length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {notification.data.ticketNumber && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        Ticket Number
                      </span>
                      <span className="text-sm font-medium">
                        #{notification.data.ticketNumber}
                      </span>
                    </div>
                  )}
                  {notification.data.conversationId && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        Conversation ID
                      </span>
                      <span className="text-sm font-mono">
                        {notification.data.conversationId}
                      </span>
                    </div>
                  )}
                  {notification.data.meetingTitle && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        Meeting
                      </span>
                      <span className="text-sm font-medium">
                        {notification.data.meetingTitle}
                      </span>
                    </div>
                  )}
                  {notification.data.scheduledAt && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">
                        Scheduled At
                      </span>
                      <span className="text-sm">
                        {new Date(
                          notification.data.scheduledAt
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {notification.data.oldStatus &&
                    notification.data.newStatus && (
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          Status Change
                        </span>
                        <span className="text-sm">
                          {notification.data.oldStatus} →{" "}
                          {notification.data.newStatus}
                        </span>
                      </div>
                    )}
                </div>
              </div>
            )}

            <Separator />

            {/* Action Button */}
            {notification.data?.url && (
              <div>
                <Button
                  onClick={handleNavigateToResource}
                  className="w-full sm:w-auto"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Related Resource
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This notification will be
              permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
