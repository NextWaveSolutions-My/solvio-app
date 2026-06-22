/**
 * Support Agent Notifications Page
 *
 * Displays all notifications for support agents with filtering, search, pagination, and real-time updates.
 */

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import type { SessionUser } from "@/lib/auth";
import { EnhancedNotificationList } from "@/components/notifications/enhanced-notification-list";

export const metadata = {
  title: "Notifications | Support Agent",
  description: "View and manage your notifications",
};

export default async function SupportAgentNotificationsPage() {
  const session = await requireAuth();
  const userRole = (session.user as SessionUser).role || "customer";

  // Only support agents can access this page
  if (userRole !== "support") {
    redirect("/unauthorized");
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <EnhancedNotificationList
        userId={session.user.id}
        basePath="/support-agent/notifications"
      />
    </div>
  );
}
