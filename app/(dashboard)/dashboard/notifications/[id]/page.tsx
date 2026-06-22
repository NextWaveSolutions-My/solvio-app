import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  getNotificationById,
  markNotificationAsRead,
} from "@/lib/notifications";
import { NotificationDetail } from "@/components/notifications/notification-detail";
import type { Notification } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Type for notification with string _id (converted from ObjectId)
type NotificationWithStringId = Omit<Notification, "_id"> & { _id: string };

export default async function NotificationDetailPage({ params }: PageProps) {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  const { id } = await params;

  // Get notification
  const result = await getNotificationById(id, session.user.id);

  if (!result.success || !result.notification) {
    redirect("/dashboard/notifications");
  }

  // Auto-mark as read when viewing detail page
  const notification = result.notification as NotificationWithStringId;

  if (!notification.read) {
    await markNotificationAsRead(id, session.user.id);
    notification.read = true;
    notification.readAt = new Date();
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <NotificationDetail
        notification={notification}
        backUrl="/dashboard/notifications"
      />
    </div>
  );
}
