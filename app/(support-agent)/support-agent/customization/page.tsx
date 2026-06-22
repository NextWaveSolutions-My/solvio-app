import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StatsGrid } from "@/components/shared/stats-grid";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { TicketCard } from "@/components/tickets/ticket-card";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { getMyCustomizationRequests } from "@/actions/support-agent";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { Wrench, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { EmptySearchResults } from "@/components/shared/empty-search-results";

interface CustomizationPageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    view?: string;
  }>;
}

export default async function SupportAgentCustomizationPage({
  searchParams,
}: CustomizationPageProps) {
  const params = await searchParams;
  const filters = {
    status: params.status,
    priority: params.priority,
    search: params.search,
  };

  const viewMode = params.view === "card" ? "card" : "table";

  // Get assigned customization requests with filters
  const requestsResult = await getMyCustomizationRequests(filters);
  const requests = requestsResult.success ? requestsResult.data || [] : [];

  // Status buckets
  const openRequests = requests.filter((r) => r.status === "open");
  const scheduledMeetingRequests = requests.filter(
    (r) => r.status === "scheduled_meeting"
  );
  const waitingRequests = requests.filter(
    (r) => r.status === "waiting_on_customer"
  );
  const inProgressRequests = requests.filter((r) => r.status === "in_progress");
  const resolvedRequests = requests.filter((r) => r.status === "resolved");
  const closedRequests = requests.filter((r) => r.status === "closed");

  const customizationStats = [
    {
      title: "Total Assigned",
      value: requests.length,
      icon: Wrench,
      iconColor: "text-slate-600",
      iconBgColor: "bg-slate-50 dark:bg-slate-950",
      description: "Customization requests assigned to you",
    },
    {
      title: "Open",
      value: openRequests.length,
      icon: AlertCircle,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-50 dark:bg-amber-950",
      description: "Awaiting your review",
    },
    {
      title: "In Progress",
      value: inProgressRequests.length,
      icon: Clock,
      iconColor: "text-indigo-600",
      iconBgColor: "bg-indigo-50 dark:bg-indigo-950",
      description: "You are currently working on",
    },
    {
      title: "Resolved / Closed",
      value: resolvedRequests.length + closedRequests.length,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-50 dark:bg-emerald-950",
      description: "Completed customization requests",
    },
  ];

  const tabItems = [
    { value: "all", label: "All", count: requests.length },
    { value: "open", label: "Open", count: openRequests.length },
    {
      value: "scheduled_meeting",
      label: "Scheduled Meeting",
      count: scheduledMeetingRequests.length,
    },
    {
      value: "waiting_on_customer",
      label: "Waiting",
      count: waitingRequests.length,
    },
    {
      value: "in_progress",
      label: "In Progress",
      count: inProgressRequests.length,
    },
    { value: "resolved", label: "Resolved", count: resolvedRequests.length },
    { value: "closed", label: "Closed", count: closedRequests.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Customization Requests</h1>
        <p className="text-muted-foreground mt-1">
          Manage customization service requests assigned to you
        </p>
      </div>

      {/* Stats */}
      <StatsGrid stats={customizationStats} />

      {/* Requests List */}
      <Card className="p-4">
        <Tabs defaultValue="all">
          <PageTabsHeader
            tabs={tabItems}
            showSearch
            searchPlaceholder="Search requests..."
            searchDefaultValue={filters.search}
            showPriorityFilter
            priorityDefaultValue={filters.priority}
            rightActions={<ViewToggle />}
          />

          <TabsContent
            value="all"
            className={viewMode === "card" ? "space-y-3" : ""}
          >
            {requests.length === 0 ? (
              <EmptySearchResults
                searchQuery={filters.search}
                entityName="requests"
              />
            ) : viewMode === "table" ? (
              <TicketsTable
                tickets={requests}
                hrefBase="/support-agent/customization"
              />
            ) : (
              requests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard
                    ticket={request}
                    hrefBase="/support-agent/customization"
                  />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent
            value="open"
            className={viewMode === "card" ? "space-y-3" : ""}
          >
            {openRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No open customization requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable tickets={openRequests} hrefBase="/support-agent/customization" />
            ) : (
              openRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/support-agent/customization" />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent
            value="scheduled_meeting"
            className={viewMode === "card" ? "space-y-3" : ""}
          >
            {scheduledMeetingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No scheduled meeting customization requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable
                tickets={scheduledMeetingRequests}
                hrefBase="/support-agent/customization"
              />
            ) : (
              scheduledMeetingRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/support-agent/customization" />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent
            value="waiting_on_customer"
            className={viewMode === "card" ? "space-y-3" : ""}
          >
            {waitingRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No waiting customization requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable tickets={waitingRequests} hrefBase="/support-agent/customization" />
            ) : (
              waitingRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/support-agent/customization" />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent
            value="in_progress"
            className={viewMode === "card" ? "space-y-3" : ""}
          >
            {inProgressRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No in-progress customization requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable
                tickets={inProgressRequests}
                hrefBase="/support-agent/customization"
              />
            ) : (
              inProgressRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/support-agent/customization" />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent
            value="resolved"
            className={viewMode === "card" ? "space-y-3" : ""}
          >
            {resolvedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No resolved customization requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable tickets={resolvedRequests} hrefBase="/support-agent/customization" />
            ) : (
              resolvedRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/support-agent/customization" />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent
            value="closed"
            className={viewMode === "card" ? "space-y-3" : ""}
          >
            {closedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No closed customization requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable tickets={closedRequests} hrefBase="/support-agent/customization" />
            ) : (
              closedRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/support-agent/customization" />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
