import Link from "next/link";
import { getAllTickets } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { StatsGrid } from "@/components/shared/stats-grid";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { TicketCard } from "@/components/tickets/ticket-card";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { EmptySearchResults } from "@/components/shared/empty-search-results";
import {
  Ticket as TicketIcon,
  AlertCircle,
  Clock,
  CheckCircle2,
  Plus,
} from "lucide-react";

// Disable static generation for this page since it has dynamic data
export const dynamic = "force-dynamic";

interface TicketsPageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    view?: string;
  }>;
}

export default async function AdminTicketsPage({
  searchParams,
}: TicketsPageProps) {
  const params = await searchParams;
  const filters = {
    status: params.status,
    priority: params.priority,
    search: params.search,
  };

  // Get tickets with filters
  const ticketsResult = await getAllTickets(filters);
  const tickets = ticketsResult.success ? ticketsResult.data || [] : [];

  const viewMode = params.view === "card" ? "card" : "table";

  // Status buckets
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

  // Stats configuration for admin-wide overview
  const ticketStats = [
    {
      title: "Total Tickets",
      value: tickets.length,
      icon: TicketIcon,
      iconColor: "text-sky-600",
      iconBgColor: "bg-sky-50 dark:bg-sky-950",
      description: "All tickets in the system",
    },
    {
      title: "Open Tickets",
      value: openTickets.length,
      icon: AlertCircle,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-50 dark:bg-amber-950",
      description: "Awaiting response",
    },
    {
      title: "In Progress",
      value: inProgressTickets.length,
      icon: Clock,
      iconColor: "text-indigo-600",
      iconBgColor: "bg-indigo-50 dark:bg-indigo-950",
      description: "Being worked on",
    },
    {
      title: "Resolved / Closed",
      value: resolvedTickets.length + closedTickets.length,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-50 dark:bg-emerald-950",
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Tickets</h1>
          <p className="text-muted-foreground mt-2">
            Manage and respond to customer support tickets
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/admin/tickets/new">
            <Plus className="h-4 w-4" />
            Create Ticket
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsGrid stats={ticketStats} />

      {/* Tickets List */}
      <Card className="border-border rounded-lg p-3 shadow-none sm:p-4">
        <Tabs defaultValue="all">
          <PageTabsHeader
            tabs={tabItems}
            showSearch
            searchPlaceholder="Search tickets..."
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
              <TicketsTable tickets={tickets} hrefBase="/admin/tickets" />
            ) : (
              tickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard ticket={ticket} hrefBase="/admin/tickets" />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent
            value="open"
            className={viewMode === "card" ? "space-y-3" : ""}
          >
            {openTickets.length === 0 ? (
              <Card className="rounded-lg">
                <CardContent className="py-8  text-center text-muted-foreground">
                  No open tickets
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable tickets={openTickets} hrefBase="/admin/tickets" />
            ) : (
              openTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard ticket={ticket} hrefBase="/admin/tickets" />
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
              <TicketsTable
                tickets={scheduledMeetingTickets}
                hrefBase="/admin/tickets"
              />
            ) : (
              scheduledMeetingTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard ticket={ticket} hrefBase="/admin/tickets" />
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
              <TicketsTable
                tickets={waitingTickets}
                hrefBase="/admin/tickets"
              />
            ) : (
              waitingTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard ticket={ticket} hrefBase="/admin/tickets" />
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
              <TicketsTable
                tickets={inProgressTickets}
                hrefBase="/admin/tickets"
              />
            ) : (
              inProgressTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard ticket={ticket} hrefBase="/admin/tickets" />
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
              <TicketsTable
                tickets={resolvedTickets}
                hrefBase="/admin/tickets"
              />
            ) : (
              resolvedTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard ticket={ticket} hrefBase="/admin/tickets" />
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
              <TicketsTable tickets={closedTickets} hrefBase="/admin/tickets" />
            ) : (
              closedTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard ticket={ticket} hrefBase="/admin/tickets" />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
