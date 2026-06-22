import Link from "next/link";
import { requireAuth } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { getMyTickets } from "@/actions/tickets";
import { Card, CardContent } from "@/components/ui/card";
import { StatsGrid } from "@/components/shared/stats-grid";
import { TicketCard } from "@/components/tickets/ticket-card";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { EmptySearchResults } from "@/components/shared/empty-search-results";
import {
  Plus,
  Ticket as TicketIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
interface TicketsPageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    view?: string;
  }>;
}

export default async function TicketsPage({ searchParams }: TicketsPageProps) {
  await requireAuth();
  const params = await searchParams;
  const filters = {
    status: params.status,
    priority: params.priority,
    search: params.search,
  };
  const viewMode = params.view || "table";

  const ticketsResult = await getMyTickets(filters);
  const tickets = ticketsResult.success ? ticketsResult.data || [] : [];

  // Filter tickets by status
  const openTickets = tickets.filter((t) => t.status === "open");
  const scheduledMeetingTickets = tickets.filter(
    (t) => t.status === "scheduled_meeting"
  );
  const waitingTickets = tickets.filter(
    (t) => t.status === "waiting_on_customer"
  );
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved");
  const closedTickets = tickets.filter((t) => t.status === "closed");

  const ticketStats = [
    {
      title: "Open",
      value: openTickets.length,
      icon: AlertCircle,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-50 dark:bg-blue-950",
      description: "Active tickets",
    },
    {
      title: "In Progress",
      value: inProgressTickets.length,
      icon: Clock,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-50 dark:bg-amber-950",
      description: "Being worked on",
    },
    {
      title: "Resolved",
      value: resolvedTickets.length,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-50 dark:bg-green-950",
      description: "Successfully fixed",
    },
    {
      title: "Closed",
      value: closedTickets.length,
      icon: XCircle,
      iconColor: "text-slate-600",
      iconBgColor: "bg-slate-50 dark:bg-slate-950",
      description: "Completed tickets",
    },
  ];

  const tabItems = [
    { value: "all", label: "All", count: tickets.length },
    { value: "open", label: "Open", count: openTickets.length },
    {
      value: "scheduled_meeting",
      label: "Scheduled Meeting",
      count: scheduledMeetingTickets.length,
    },
    {
      value: "waiting_on_customer",
      label: "Waiting",
      count: waitingTickets.length,
    },
    {
      value: "in_progress",
      label: "In Progress",
      count: inProgressTickets.length,
    },
    { value: "resolved", label: "Resolved", count: resolvedTickets.length },
    { value: "closed", label: "Closed", count: closedTickets.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Tickets</h1>
          <p className="text-muted-foreground">
            View and manage all your support tickets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/dashboard/tickets/new">
              <Plus className="h-4 w-4" />
              New Ticket
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsGrid stats={ticketStats} />

      {/* Tickets List */}
      {tickets.length === 0 && !filters.search && !filters.priority ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TicketIcon className="mx-auto h-12 w-12 text-muted-foreground" />
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
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border p-4 shadow-none">
          <Tabs defaultValue="all">
            {/* Header with Tabs and Actions */}
            <PageTabsHeader
              tabs={tabItems}
              showSearch
              searchPlaceholder="Search..."
              searchDefaultValue={filters.search}
              showPriorityFilter
              priorityDefaultValue={filters.priority}
              rightActions={<ViewToggle />}
            />
            <TabsContent
              value="all"
              className={viewMode === "card" ? "space-y-3" : ""}
            >
              {tickets.length === 0 ? (
                <EmptySearchResults
                  searchQuery={filters.search}
                  entityName="tickets"
                />
              ) : viewMode === "table" ? (
                <TicketsTable tickets={tickets} />
              ) : (
                tickets?.map((ticket) => (
                  <div key={ticket._id.toString()}>
                    <TicketCard ticket={ticket} />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent
              value="open"
              className={viewMode === "card" ? "space-y-3" : ""}
            >
              {openTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No open tickets
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable tickets={openTickets} />
              ) : (
                openTickets?.map((ticket) => (
                  <div key={ticket._id.toString()}>
                    <TicketCard ticket={ticket} />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent
              value="scheduled_meeting"
              className={viewMode === "card" ? "space-y-3" : ""}
            >
              {scheduledMeetingTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No scheduled meeting tickets
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable tickets={scheduledMeetingTickets} />
              ) : (
                scheduledMeetingTickets?.map((ticket) => (
                  <div key={ticket._id.toString()}>
                    <TicketCard ticket={ticket} />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent
              value="waiting_on_customer"
              className={viewMode === "card" ? "space-y-3" : ""}
            >
              {waitingTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No waiting tickets
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable tickets={waitingTickets} />
              ) : (
                waitingTickets?.map((ticket) => (
                  <div key={ticket._id.toString()}>
                    <TicketCard ticket={ticket} />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent
              value="in_progress"
              className={viewMode === "card" ? "space-y-3" : ""}
            >
              {inProgressTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No in progress tickets
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable tickets={inProgressTickets} />
              ) : (
                inProgressTickets?.map((ticket) => (
                  <div key={ticket._id.toString()}>
                    <TicketCard ticket={ticket} />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent
              value="resolved"
              className={viewMode === "card" ? "space-y-3" : ""}
            >
              {resolvedTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No resolved tickets
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable tickets={resolvedTickets} />
              ) : (
                resolvedTickets?.map((ticket) => (
                  <div key={ticket._id.toString()}>
                    <TicketCard ticket={ticket} />
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent
              value="closed"
              className={viewMode === "card" ? "space-y-3" : ""}
            >
              {closedTickets.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No closed tickets
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable tickets={closedTickets} />
              ) : (
                closedTickets?.map((ticket) => (
                  <div key={ticket._id.toString()}>
                    <TicketCard ticket={ticket} />
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </Card>
      )}
    </div>
  );
}
