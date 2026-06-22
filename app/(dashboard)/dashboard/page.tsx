import Link from "next/link";
import { requireAuth } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { getMyTickets } from "@/actions/tickets";
import { TicketCard } from "@/components/tickets/ticket-card";
import {
  Ticket,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsGrid } from "@/components/shared/stats-grid";

export default async function DashboardPage() {
  const session = await requireAuth();

  // Fetch tickets
  const ticketsResult = await getMyTickets();
  const tickets = ticketsResult.success ? ticketsResult.data || [] : [];

  // Get recent tickets (last 5)
  const recentTickets = tickets?.slice(0, 5);

  // Key metrics - single row like admin dashboard
  const keyStats = [
    {
      title: "Open Tickets",
      value: tickets.filter((t) => t.status === "open").length,
      icon: AlertCircle,
      iconColor: "text-warning",
      iconBgColor: "bg-warning/15",
      description: "Awaiting response",
    },
    {
      title: "In Progress",
      value: tickets.filter((t) => t.status === "in_progress").length,
      icon: Clock,
      iconColor: "text-accent",
      iconBgColor: "bg-accent/15",
      description: "Being worked on",
    },
    {
      title: "Resolved",
      value: tickets.filter((t) => t.status === "resolved").length,
      icon: CheckCircle2,
      iconColor: "text-success",
      iconBgColor: "bg-success/15",
      description: "Completed tickets",
    },
    {
      title: "Total Tickets",
      value: tickets.length,
      icon: Ticket,
      iconColor: "text-info",
      iconBgColor: "bg-info/15",
      description: "All time",
    },
  ];

  return (
    <div className="space-y-4 pb-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s an overview of your support activity
          </p>
        </div>
      </div>

      {/* Key Metrics - Single Row */}
      <StatsGrid stats={keyStats} />

      {/* Recent Tickets */}
      <Card className="border-border rounded-2xl shadow-sm overflow-hidden py-4">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border bg-muted/20 pb-4!">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="p-2 rounded-lg bg-info/15">
              <Ticket className="h-4 w-4 text-info" />
            </div>
            Recent Tickets
          </CardTitle>
          <Button asChild size="sm">
            <Link href="/dashboard/tickets/new">
              <Plus className="mr-2 h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentTickets?.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No tickets yet</h3>
              <p className="text-muted-foreground mt-2">
                Get started by creating your first support ticket
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/tickets/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Ticket
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard ticket={ticket} />
                </div>
              ))}
              {tickets?.length > 5 && (
                <div className="text-center pt-4">
                  <Button asChild variant="outline">
                    <Link href="/dashboard/tickets">View All Tickets</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
