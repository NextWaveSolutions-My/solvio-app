import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  getNotificationById,
  markNotificationAsRead,
} from "@/lib/notifications";
import { NotificationDetail } from "@/components/notifications/notification-detail";
import type { Notification } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NotificationDetailPage({ params }: PageProps) {
  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  // Check if user is admin
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;

  // Get notification
  const result = await getNotificationById(id, session.user.id);

  if (!result.success || !result.notification) {
    redirect("/admin/notifications");
  }

  // Auto-mark as read when viewing detail page
  let notification = result.notification as Omit<Notification, "_id"> & {
    _id: string;
  };

  if (!notification.read) {
    await markNotificationAsRead(id, session.user.id);
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
        backUrl="/admin/notifications"
      />
    </div>
  );
}
