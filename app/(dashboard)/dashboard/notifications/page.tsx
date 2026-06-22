/**
 * Notifications Page
 *
 * Displays all notifications for the current user with filtering, search, pagination, and real-time updates.
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import { EnhancedNotificationList } from "@/components/notifications/enhanced-notification-list";

export const metadata = {
  title: "Notifications | Support App",
  description: "View and manage your notifications",
};

export default async function NotificationsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <EnhancedNotificationList
        userId={session.user.id}
        basePath="/dashboard/notifications"
      />
    </div>
  );
}
