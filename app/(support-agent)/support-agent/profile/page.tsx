import { ObjectId, type Filter } from "mongodb";
import type { User } from "@/types";
import { getCollection } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { requireAuth } from "@/lib/auth-utils";
import { getSupportAgentStats } from "@/actions/support-agent";
import { ProfileForm } from "@/components/profile/profile-form";
import { Ticket, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { NotificationPreferences } from "@/components/profile/notification-preferences";
import { StatsGrid } from "@/components/shared/stats-grid";

// Disable static generation for this page since it has dynamic data
export const dynamic = "force-dynamic";

export default async function SupportAgentProfilePage() {
  const session = await requireAuth();
  const role = (session.user as SessionUser).role || "customer";

  // Only support agents can access this page
  if (role !== "support") {
    return null;
  }

  const users = await getCollection<User>("user");
  let user = await users.findOne({ id: session.user.id } as Filter<User>);
  if (!user && ObjectId.isValid(session.user.id)) {
    user = await users.findOne({
      _id: new ObjectId(session.user.id),
    } as Filter<User>);
  }

  // Get support agent statistics
  const statsResult = await getSupportAgentStats();
  const stats = statsResult.success ? statsResult.data : null;
  const agentStats = stats
    ? [
        {
          title: "Total Assigned",
          value: stats.totalAssigned,
          icon: Ticket,
          iconColor: "text-info",
          iconBgColor: "bg-info/15",
          description: "All assigned tickets",
        },
        {
          title: "Open Tickets",
          value: stats.openTickets,
          icon: AlertCircle,
          iconColor: "text-warning",
          iconBgColor: "bg-warning/15",
          description: "Awaiting response",
        },
        {
          title: "In Progress",
          value: stats.inProgressTickets,
          icon: Clock,
          iconColor: "text-accent",
          iconBgColor: "bg-accent/15",
          description: "Being worked on",
        },
        {
          title: "Resolved",
          value: stats.resolvedTickets,
          icon: CheckCircle2,
          iconColor: "text-success",
          iconBgColor: "bg-success/15",
          description: "Completed tickets",
        },
      ]
    : [];

  const initialData = {
    id: user?.id || session.user.id,
    name: user?.name || session.user.name || "",
    email: user?.email || session.user.email || "",
    phone: user?.phone || "",
    envatoUsername: user?.envatoUsername || "",
    country: user?.country || "",
    image: user?.image || session.user.image || "",
    role,
    createdAt: (user?.createdAt
      ? new Date(user.createdAt)
      : new Date()
    ).toISOString(),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your support agent profile and view your statistics
        </p>
      </div>

      {/* Statistics Overview */}
      {stats && <StatsGrid stats={agentStats} />}

      {/* Profile Form */}
      <ProfileForm initialData={initialData} />

      {/* Notification Preferences */}
      <NotificationPreferences />
    </div>
  );
}
