import Link from "next/link";
import { requireAuth } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { StatsGrid } from "@/components/shared/stats-grid";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { TicketCard } from "@/components/tickets/ticket-card";
import { getMyCustomizationRequests } from "@/actions/tickets";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { EmptySearchResults } from "@/components/shared/empty-search-results";
import { Wrench, Plus, Clock, CheckCircle2, AlertCircle } from "lucide-react";

// Disable static generation for this page since it has dynamic data
export const dynamic = "force-dynamic";

interface CustomizationPageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    view?: string;
  }>;
}

export default async function CustomizationPage({
  searchParams,
}: CustomizationPageProps) {
  await requireAuth();
  const params = await searchParams;
  const filters = {
    status: params.status,
    priority: params.priority,
    search: params.search,
  };
  const viewMode = params.view === "card" ? "card" : "table";

  // Get customization requests for the current user
  const requestsResult = await getMyCustomizationRequests(filters);
  const requests = requestsResult.success ? requestsResult.data || [] : [];

  // Segment requests by status
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
      title: "Open",
      value: openRequests.length,
      icon: AlertCircle,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-50 dark:bg-blue-950",
      description: "Awaiting review",
    },
    {
      title: "In Progress",
      value: inProgressRequests.length,
      icon: Clock,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-50 dark:bg-amber-950",
      description: "Being worked on",
    },
    {
      title: "Completed",
      value: resolvedRequests.length + closedRequests.length,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      iconBgColor: "bg-green-50 dark:bg-green-950",
      description: "Resolved or closed",
    },
    {
      title: "Total Requests",
      value: requests.length,
      icon: Wrench,
      iconColor: "text-slate-600",
      iconBgColor: "bg-slate-50 dark:bg-slate-950",
      description: "All customization requests",
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
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              My Customization Requests
            </h1>
          </div>
          <p className="text-muted-foreground mt-2">
            View and manage your customization and feature requests
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/customization/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <StatsGrid stats={customizationStats} />

      {/* Requests List */}
      {requests.length === 0 && !filters.search && !filters.priority ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wrench className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              No customization requests yet
            </h3>
            <p className="text-muted-foreground mt-2">
              Get started by creating your first customization request
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/customization/new">
                <Plus className="mr-2 h-4 w-4" />
                New Request
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                  hrefBase="/dashboard/customization"
                />
              ) : (
                requests.map((request) => (
                  <div key={request._id.toString()}>
                    <TicketCard
                      ticket={request}
                      hrefBase="/dashboard/customization"
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
                    No open requests
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable
                  tickets={openRequests}
                  hrefBase="/dashboard/customization"
                />
              ) : (
                openRequests.map((request) => (
                  <div key={request._id.toString()}>
                    <TicketCard
                      ticket={request}
                      hrefBase="/dashboard/customization"
                    />
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
                    No scheduled meeting requests
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable
                  tickets={scheduledMeetingRequests}
                  hrefBase="/dashboard/customization"
                />
              ) : (
                scheduledMeetingRequests.map((request) => (
                  <div key={request._id.toString()}>
                    <TicketCard
                      ticket={request}
                      hrefBase="/dashboard/customization"
                    />
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
                    No waiting requests
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable
                  tickets={waitingRequests}
                  hrefBase="/dashboard/customization"
                />
              ) : (
                waitingRequests.map((request) => (
                  <div key={request._id.toString()}>
                    <TicketCard
                      ticket={request}
                      hrefBase="/dashboard/customization"
                    />
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
                    No in progress requests
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable
                  tickets={inProgressRequests}
                  hrefBase="/dashboard/customization"
                />
              ) : (
                inProgressRequests.map((request) => (
                  <div key={request._id.toString()}>
                    <TicketCard
                      ticket={request}
                      hrefBase="/dashboard/customization"
                    />
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
                    No resolved requests
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable
                  tickets={resolvedRequests}
                  hrefBase="/dashboard/customization"
                />
              ) : (
                resolvedRequests.map((request) => (
                  <div key={request._id.toString()}>
                    <TicketCard
                      ticket={request}
                      hrefBase="/dashboard/customization"
                    />
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
                    No closed requests
                  </CardContent>
                </Card>
              ) : viewMode === "table" ? (
                <TicketsTable
                  tickets={closedRequests}
                  hrefBase="/dashboard/customization"
                />
              ) : (
                closedRequests.map((request) => (
                  <div key={request._id.toString()}>
                    <TicketCard
                      ticket={request}
                      hrefBase="/dashboard/customization"
                    />
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
