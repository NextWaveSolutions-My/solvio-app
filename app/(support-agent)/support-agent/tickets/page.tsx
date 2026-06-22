import { getMyAssignedTickets } from "@/actions/support-agent";
import { Card, CardContent } from "@/components/ui/card";
import { StatsGrid } from "@/components/shared/stats-grid";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { EmptySearchResults } from "@/components/shared/empty-search-results";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { TicketCard } from "@/components/tickets/ticket-card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Ticket as TicketIcon,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface TicketsPageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    view?: string;
  }>;
}

export default async function SupportAgentTicketsPage({
  searchParams,
}: TicketsPageProps) {
  const params = await searchParams;
  const filters = {
    status: params.status,
    priority: params.priority,
    search: params.search,
  };

  // Get assigned tickets with filters
  const ticketsResult = await getMyAssignedTickets(filters);
  const tickets = ticketsResult.success ? ticketsResult.data || [] : [];

  const viewMode = params.view === "card" ? "card" : "table";

  // Status buckets for assigned tickets
  const openTickets = tickets.filter((t) => t.status === "open");
  const scheduledMeetingTickets = tickets.filter(
    (t) => t.status === "scheduled_meeting",
  );
  const waitingTickets = tickets.filter(
    (t) => t.status === "waiting_on_customer",
  );
  const inProgressTickets = tickets.filter((t) => t.status === "in_progress");
  const resolvedTickets = tickets.filter((t) => t.status === "resolved");
  const closedTickets = tickets.filter((t) => t.status === "closed");

  const ticketStats = [
    {
      title: "Total Assigned",
      value: tickets.length,
      icon: TicketIcon,
      iconColor: "text-sky-600",
      iconBgColor: "bg-sky-50 dark:bg-sky-950",
      description: "Tickets assigned to you",
    },
    {
      title: "Open",
      value: openTickets.length,
      icon: AlertCircle,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-50 dark:bg-amber-950",
      description: "Waiting for your response",
    },
    {
      title: "In Progress",
      value: inProgressTickets.length,
      icon: Clock,
      iconColor: "text-indigo-600",
      iconBgColor: "bg-indigo-50 dark:bg-indigo-950",
      description: "You are currently working on",
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My Assigned Tickets</h1>
        <p className="text-muted-foreground mt-1">
          Manage and respond to tickets assigned to you
        </p>
      </div>

      {/* Stats Cards */}
      <StatsGrid stats={ticketStats} />

      {/* Tickets List */}
      <Card className="border-border p-3 shadow-none sm:p-4">
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
              <TicketsTable
                tickets={tickets}
                hrefBase="/support-agent/tickets"
              />
            ) : (
              tickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard
                    ticket={ticket}
                    hrefBase="/support-agent/tickets"
                  />
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
              <TicketsTable
                tickets={openTickets}
                hrefBase="/support-agent/tickets"
              />
            ) : (
              openTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard
                    ticket={ticket}
                    hrefBase="/support-agent/tickets"
                  />
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
                hrefBase="/support-agent/tickets"
              />
            ) : (
              scheduledMeetingTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard
                    ticket={ticket}
                    hrefBase="/support-agent/tickets"
                  />
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
                hrefBase="/support-agent/tickets"
              />
            ) : (
              waitingTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard
                    ticket={ticket}
                    hrefBase="/support-agent/tickets"
                  />
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
                hrefBase="/support-agent/tickets"
              />
            ) : (
              inProgressTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard
                    ticket={ticket}
                    hrefBase="/support-agent/tickets"
                  />
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
                hrefBase="/support-agent/tickets"
              />
            ) : (
              resolvedTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard
                    ticket={ticket}
                    hrefBase="/support-agent/tickets"
                  />
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
              <TicketsTable
                tickets={closedTickets}
                hrefBase="/support-agent/tickets"
              />
            ) : (
              closedTickets?.map((ticket) => (
                <div key={ticket._id.toString()}>
                  <TicketCard
                    ticket={ticket}
                    hrefBase="/support-agent/tickets"
                  />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
