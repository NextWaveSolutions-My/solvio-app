/**
 * Admin Notifications Page
 *
 * Displays all notifications for admin users with filtering, search, pagination, and real-time updates.
 */

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import type { SessionUser } from "@/lib/auth";
import { EnhancedNotificationList } from "@/components/notifications/enhanced-notification-list";

export const metadata = {
  title: "Notifications | Admin Panel",
  description: "View and manage your notifications",
};

export default async function AdminNotificationsPage() {
  const session = await requireAuth();
  const userRole = (session.user as SessionUser).role || "customer";

  if (userRole !== "admin") {
    redirect("/unauthorized");
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <EnhancedNotificationList
        userId={session.user.id}
        basePath="/admin/notifications"
      />
    </div>
  );
}
