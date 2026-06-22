import Link from "next/link";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getGreeting } from "@/lib/greeting";
import { getSession } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";

import {
  getDashboardStats,
  getAllTickets,
  getRecentUsers,
  getPriorityDistribution,
  getStatusDistribution,
} from "@/actions/admin";
import { StatsGrid } from "@/components/shared/stats-grid";
import { StatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { DashboardGreeting } from "@/components/shared/dashboard-greeting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  UserPlus,
  AlertTriangle,
  BarChart3,
  FileText,
  TrendingUp,
} from "lucide-react";
import type { Ticket as TicketType, User as UserType } from "@/types";

// Force dynamic rendering for authenticated routes
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Fetch all data in parallel for better performance
  const [
    statsResult,
    ticketsResult,
    recentUsersResult,
    priorityDistResult,
    statusDistResult,
    session,
  ] = await Promise.all([
    getDashboardStats(),
    getAllTickets(),
    getRecentUsers(5),
    getPriorityDistribution(),
    getStatusDistribution(),
    getSession(),
  ]);

  const userName = session?.user?.name ?? null;

  const stats = statsResult.success ? statsResult.data : null;
  const allTickets = ticketsResult.success ? ticketsResult.data || [] : [];
  const recentTickets = allTickets.slice(0, 10);
  const recentUsers = recentUsersResult.success
    ? recentUsersResult.data || []
    : [];
  const priorityDist = priorityDistResult.success
    ? priorityDistResult.data || []
    : [];

  // Ensure all statuses are represented, even if count is 0
  const allStatuses: Array<
    | "open"
    | "scheduled_meeting"
    | "waiting_on_customer"
    | "in_progress"
    | "resolved"
    | "closed"
  > = [
    "open",
    "scheduled_meeting",
    "waiting_on_customer",
    "in_progress",
    "resolved",
    "closed",
  ];

  const statusDistData = statusDistResult.success
    ? statusDistResult.data || []
    : [];
  const statusDist = allStatuses.map((status) => {
    const existing = statusDistData.find((s) => s.status === status);
    return existing || { status, count: 0 };
  });

  // Get user information for tickets
  const usersCollection = await getCollection<UserType>("user");
  const userIds = [
    ...new Set([
      ...recentTickets.map((t) => t.customerId),
      ...recentTickets
        .filter((t) => t.assignedToId)
        .map((t) => t.assignedToId as string),
    ]),
  ].filter(Boolean);

  const usersData = await usersCollection
    .find({ id: { $in: userIds } })
    .toArray();

  const users: Record<
    string,
    { name: string; email: string; role: string; image?: string }
  > = {};
  usersData.forEach((user) => {
    users[user.id] = {
      name: user.name || "Unknown User",
      email: user.email || "",
      role: user.role || "customer",
      image: user.image,
    };
  });

  // Fetch any missing users by _id (fallback for old data)
  const missingUserIds = userIds.filter((userId) => !users[userId]);
  if (missingUserIds.length > 0) {
    try {
      const validObjectIds = missingUserIds.filter((id) =>
        ObjectId.isValid(id)
      );
      if (validObjectIds.length > 0) {
        const missingUsers = await usersCollection
          .find({
            _id: { $in: validObjectIds.map((id) => new ObjectId(id)) },
          })
          .toArray();

        missingUsers.forEach((user) => {
          const userId = user._id.toString();
          users[userId] = {
            name: user.name || "Unknown User",
            email: user.email || "",
            role: user.role || "customer",
            image: user.image,
          };
        });
      }
    } catch (error) {
      console.error("Error fetching missing users:", error);
    }
  }

  // Prepare key stats data - most important metrics in single row
  const keyStatsData = stats
    ? [
        {
          title: "Open Tickets",
          value: stats.openTickets,
          icon: AlertCircle,
          iconColor: "text-warning",
          iconBgColor: "bg-warning/15",
          description: "Awaiting response",
        },
        {
          title: "Urgent",
          value: stats.urgentTickets,
          icon: AlertTriangle,
          iconColor: "text-destructive",
          iconBgColor: "bg-destructive/15",
          description: "Require immediate attention",
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

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <DashboardGreeting
        name={userName}
        initialGreeting={getGreeting()}
        subtitle="Here's what's happening with your support desk today."
      />

      {/* Key Metrics - Single Row */}
      <StatsGrid stats={keyStatsData} />
      {/* Recent Activity Section */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Recent Tickets */}
        <Card className="border-border rounded-lg shadow-sm overflow-hidden py-4">
          <CardHeader className="flex flex-col items-start gap-3 border-b border-border bg-muted/20 pb-4! sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="p-2 rounded-lg bg-info/15">
                <FileText className="h-4 w-4 text-info" />
              </div>
              Recent Tickets
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-8 w-full sm:w-auto">
              <Link href="/admin/tickets" className="text-xs">
                View All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No tickets yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentTickets.slice(0, 5).map((ticket: TicketType) => {
                  const customer = users[ticket.customerId];
                  return (
                    <Link
                      key={ticket._id.toString()}
                      href={`/admin/tickets/${ticket._id.toString()}`}
                      className="group block rounded-xl border border-border p-3 transition-all hover:border-info/40 hover:bg-muted/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                              {ticket.ticketNumber}
                            </span>
                            <StatusBadge status={ticket.status} />
                            <PriorityBadge priority={ticket.priority} />
                          </div>
                          <h3 className="font-medium text-sm text-foreground truncate group-hover:text-info transition-colors">
                            {ticket.title}
                          </h3>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {customer?.name || "Unknown"}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent User Registrations */}
        <Card className="border-border rounded-lg shadow-sm overflow-hidden py-4">
          <CardHeader className="flex flex-col items-start gap-3 border-b border-border bg-muted/20 pb-4! sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="p-2 rounded-lg bg-success/15">
                <UserPlus className="h-4 w-4 text-success" />
              </div>
              Recent Users
            </CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-8 w-full sm:w-auto">
              <Link href="/admin/users" className="text-xs">
                View All
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No recent users
              </p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user: UserType) => (
                  <Link
                    key={user._id.toString()}
                    href={`/admin/users/${user.id}`}
                    className="group block rounded-xl border border-border p-3 transition-all hover:border-success/40 hover:bg-muted/20"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center text-success font-semibold text-sm">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground truncate group-hover:text-success transition-colors">
                            {user.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="inline-flex items-center rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground capitalize">
                          {user.role}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Visualizations - Priority & Status Distribution */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Priority Distribution */}
        <Card className="border-border rounded-lg shadow-sm overflow-hidden py-4">
          <CardHeader className="border-b border-border bg-muted/20 pb-2!">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="p-2 rounded-lg bg-info/15">
                <BarChart3 className="h-4 w-4 text-info" />
              </div>
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priorityDist.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No data available
              </p>
            ) : (
              <div className="flex flex-col items-center">
                {/* Donut Chart */}
                <div className="relative mb-8 h-44 w-44 sm:h-52 sm:w-52">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 120 120"
                  >
                    {(() => {
                      const total = priorityDist.reduce(
                        (sum, i) => sum + i.count,
                        0
                      );
                      const centerX = 60;
                      const centerY = 60;
                      const radius = 45;
                      const strokeWidth = 16;
                      const circumference = 2 * Math.PI * radius;
                      let accumulatedAngle = 0;

                      const priorityColors: Record<string, string> = {
                        urgent: "#ef4444",
                        high: "#f59e0b",
                        medium: "#3b82f6",
                        low: "#10b981",
                      };

                      // Sort to ensure consistent order: urgent, high, medium, low
                      const sortedDist = [...priorityDist].sort((a, b) => {
                        const order = { urgent: 0, high: 1, medium: 2, low: 3 };
                        return (
                          (order[a.priority as keyof typeof order] || 4) -
                          (order[b.priority as keyof typeof order] || 4)
                        );
                      });

                      return sortedDist.map((item) => {
                        const percentage = item.count / total;
                        const segmentLength = percentage * circumference;
                        const gapLength = circumference - segmentLength;

                        // Add small gap between segments (1% of circumference)
                        const gap = 0.01 * circumference;
                        const adjustedSegmentLength = Math.max(
                          0,
                          segmentLength - gap
                        );

                        const strokeDasharray = `${adjustedSegmentLength} ${
                          gapLength + gap
                        }`;
                        const rotation = accumulatedAngle;

                        accumulatedAngle += percentage * circumference;

                        return (
                          <circle
                            key={item.priority}
                            cx={centerX}
                            cy={centerY}
                            r={radius}
                            fill="transparent"
                            stroke={priorityColors[item.priority] || "#6b7280"}
                            strokeWidth={strokeWidth}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={-rotation}
                            strokeLinecap="round"
                            className="transition-all duration-700 ease-in-out"
                            style={{
                              filter:
                                "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))",
                            }}
                          />
                        );
                      });
                    })()}
                  </svg>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Total
                    </span>
                    <span className="text-4xl font-bold text-foreground mt-1">
                      {priorityDist.reduce((sum, i) => sum + i.count, 0)}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="grid w-full grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                  {(() => {
                    const total = priorityDist.reduce(
                      (sum, i) => sum + i.count,
                      0
                    );
                    const priorityColors: Record<string, string> = {
                      urgent: "bg-destructive",
                      high: "bg-warning",
                      medium: "bg-info",
                      low: "bg-success",
                    };

                    // Sort to match chart order
                    const sortedDist = [...priorityDist].sort((a, b) => {
                      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
                      return (
                        (order[a.priority as keyof typeof order] || 4) -
                        (order[b.priority as keyof typeof order] || 4)
                      );
                    });

                    return sortedDist.map((item) => {
                      const percentage = Math.round((item.count / total) * 100);

                      return (
                        <div
                          key={item.priority}
                          className="flex items-center gap-2.5"
                        >
                          <div
                            className={`h-3 w-3 rounded-full flex-shrink-0 ${
                              priorityColors[item.priority]
                            }`}
                          />
                          <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                            <span className="text-sm text-foreground capitalize font-medium truncate">
                              {item.priority}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="border-border rounded-lg shadow-sm overflow-hidden py-4">
          <CardHeader className="border-b border-border bg-muted/20 pb-2!">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <div className="p-2 rounded-lg bg-success/15">
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusDist.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No data available
              </p>
            ) : (
              <div className="flex flex-col">
                {/* Legend at top */}
                <div className="mb-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {(() => {
                    const total = statusDist.reduce(
                      (sum, i) => sum + i.count,
                      0
                    );
                    const statusColors: Record<string, string> = {
                      open: "bg-info",
                      in_progress: "bg-primary",
                      waiting_on_customer: "bg-warning",
                      resolved: "bg-success",
                      closed: "bg-muted-foreground",
                      scheduled_meeting: "bg-purple-500",
                    };
                    const statusLabels: Record<string, string> = {
                      open: "Open",
                      in_progress: "In Progress",
                      waiting_on_customer: "Waiting",
                      resolved: "Resolved",
                      closed: "Closed",
                      scheduled_meeting: "Meeting",
                    };

                    return statusDist.map((item) => {
                      const percentage = Math.round((item.count / total) * 100);
                      return (
                        <div key={item.status} className="flex items-center gap-2 min-w-0">
                          <div
                            className={`h-3 w-3 rounded-full ${
                              statusColors[item.status]
                            }`}
                          />
                          <span className="min-w-0 truncate text-xs font-medium text-foreground">
                            {statusLabels[item.status] || item.status}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            (+{percentage}%)
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Bar Chart */}
                <div className="overflow-x-auto pb-2">
                  <div className="flex h-64 min-w-[420px] items-end justify-between gap-3">
                    {(() => {
                    const maxCount = Math.max(
                      ...statusDist.map((i) => i.count)
                    );
                    const statusColors: Record<string, string> = {
                      open: "bg-info",
                      in_progress: "bg-primary",
                      waiting_on_customer: "bg-warning",
                      resolved: "bg-success",
                      closed: "bg-muted-foreground",
                      scheduled_meeting: "bg-purple-500",
                    };
                    const statusLabels: Record<string, string> = {
                      open: "Open",
                      in_progress: "In Progress",
                      waiting_on_customer: "Waiting",
                      resolved: "Resolved",
                      closed: "Closed",
                      scheduled_meeting: "Meeting",
                    };

                    return statusDist.map((item) => {
                      const heightPercentage =
                        maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                      return (
                        <div
                          key={item.status}
                          className="flex-1 flex flex-col items-center gap-3"
                        >
                          {/* Bar */}
                          <div
                            className="w-full flex items-end"
                            style={{ height: "200px" }}
                          >
                            <div
                              className={`w-full rounded-t-lg transition-all duration-700 ease-out ${
                                statusColors[item.status]
                              }`}
                              style={{ height: `${heightPercentage}%` }}
                            />
                          </div>
                          {/* Label */}
                          <span className="text-xs text-muted-foreground font-medium text-center">
                            {statusLabels[item.status] || item.status}
                          </span>
                        </div>
                      );
                    });
                  })()}
                  </div>
                </div>

                {/* Values below chart */}
                <div className="mt-4 overflow-x-auto border-t border-border pt-4">
                  <div className="flex min-w-[420px] items-center justify-between gap-3">
                    {statusDist.map((item) => (
                      <div key={item.status} className="flex-1 text-center">
                        <span className="text-lg font-bold text-foreground">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
