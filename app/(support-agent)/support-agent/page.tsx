import Link from "next/link";
import { requireAuth } from "@/lib/auth-utils";
import {
  getSupportAgentStats,
  getMyAssignedTickets,
} from "@/actions/support-agent";
import { getCollection } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsGrid } from "@/components/shared/stats-grid";
import { StatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import {
  Ticket as TicketIcon,
  AlertCircle,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { formatDate } from "@/lib/settings-utils";
import type { User as UserType } from "@/types";
import { NameWithRole } from "@/components/shared/name-with-role";

export default async function SupportAgentDashboardPage() {
  const session = await requireAuth();

  // Get dashboard statistics
  const statsResult = await getSupportAgentStats();
  const stats = statsResult.success ? statsResult.data : null;

  // Get recent assigned tickets
  const ticketsResult = await getMyAssignedTickets();
  const allTickets = ticketsResult.success ? ticketsResult.data || [] : [];
  const recentTickets = allTickets.slice(0, 10);

  // Get customer information for tickets
  const usersCollection = await getCollection<UserType>("user");
  const customerIds = [
    ...new Set(recentTickets.map((t) => t.customerId)),
  ].filter(Boolean);

  const customersData = await usersCollection
    .find({ id: { $in: customerIds } })
    .toArray();

  const customers: Record<string, { name: string; email: string }> = {};
  customersData.forEach((user) => {
    customers[user.id] = {
      name: user.name,
      email: user.email,
    };
  });

  // Pre-format dates for tickets to avoid await in JSX map
  const ticketsWithDates = await Promise.all(
    recentTickets.map(async (ticket) => ({
      ...ticket,
      formattedCreatedAt: ticket.createdAt
        ? await formatDate(new Date(ticket.createdAt))
        : null,
    }))
  );

  const agentStats = stats
    ? [
        {
          title: "Total Assigned",
          value: stats.totalAssigned,
          icon: TicketIcon,
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Welcome back,{" "}
          <NameWithRole
            name={session.user.name}
            role={(session.user as { role?: string })?.role}
            className="align-middle"
            badgeClassName="h-6 px-2 text-xs"
          />
          !
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your assigned tickets
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && <StatsGrid stats={agentStats} />}

      {/* Recent Assigned Tickets */}
      <Card className="gap-2">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Recent Assigned Tickets</CardTitle>
            <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
              <Link href="/support-agent/tickets">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <div className="text-center py-12">
              <TicketIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">
                No assigned tickets
              </h3>
              <p className="text-muted-foreground mt-2">
                You don&apos;t have any tickets assigned to you yet
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ticketsWithDates.map((ticket) => {
                const customer = customers[ticket.customerId];
                const idString = ticket._id.toString();
                const href =
                  ticket.category === "feature_request"
                    ? `/support-agent/customization/${idString}`
                    : ticket.category === "technical_support"
                      ? `/support-agent/installation/${idString}`
                      : `/support-agent/tickets/${idString}`;

                return (
                  <Link
                    key={ticket._id.toString()}
                    href={href}
                    className="block p-4 border border-border rounded-lg hover:border-info/40 hover:shadow-sm transition-all"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {ticket.ticketNumber}
                          </span>
                          <StatusBadge status={ticket.status} />
                          <PriorityBadge priority={ticket.priority} />
                        </div>
                        <h3 className="font-medium text-foreground mb-1">
                          {ticket.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {ticket.description}
                        </p>
                      </div>
                      <div className="text-left text-sm text-muted-foreground sm:text-right">
                        <p className="font-medium">
                          {customer?.name || "Unknown"}
                        </p>
                        <p className="text-xs">{ticket.formattedCreatedAt}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
