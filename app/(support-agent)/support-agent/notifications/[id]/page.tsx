import {
  getNotificationById,
  markNotificationAsRead,
} from "@/lib/notifications";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Notification } from "@/types";
import { NotificationDetail } from "@/components/notifications/notification-detail";

interface PageProps {
  params: Promise<{ id: string }>;
}

type NotificationWithStringId = Omit<Notification, "_id"> & { _id: string };

export default async function NotificationDetailPage({ params }: PageProps) {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  // Check if user is support agent
  if (session.user.role !== "support") {
    redirect("/dashboard");
  }

  const { id } = await params;

  // Get notification
  const result = await getNotificationById(id, session.user.id);

  if (!result.success || !result.notification) {
    redirect("/support-agent/notifications");
  }

  // Auto-mark as read when viewing detail page
  let notification = result.notification as NotificationWithStringId;

  if (!notification.read) {
    await markNotificationAsRead(id, session.user.id);
    // Create a new object with updated properties
    notification = {
      ...notification,
      read: true,
      readAt: new Date(),
    };
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <NotificationDetail
        notification={notification}
        backUrl="/support-agent/notifications"
      />
    </div>
  );
}
