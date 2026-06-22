import { getInstallationRequests } from "@/actions/admin";
import { Card, CardContent } from "@/components/ui/card";
import { StatsGrid } from "@/components/shared/stats-grid";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { EmptySearchResults } from "@/components/shared/empty-search-results";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { TicketCard } from "@/components/tickets/ticket-card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Download, AlertCircle, Clock, CheckCircle2, Plus } from "lucide-react";

// Disable static generation for this page since it has dynamic data
export const dynamic = "force-dynamic";

interface InstallationPageProps {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    view?: string;
  }>;
}

export default async function AdminInstallationPage({
  searchParams,
}: InstallationPageProps) {
  const params = await searchParams;
  const filters = {
    status: params.status,
    priority: params.priority,
    search: params.search,
  };

  // Get installation requests (technical_support category)
  const requestsResult = await getInstallationRequests(filters);
  const requests = requestsResult.success ? requestsResult.data || [] : [];

  const viewMode = params.view === "card" ? "card" : "table";

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

  const installationStats = [
    {
      title: "Total Requests",
      value: requests.length,
      icon: Download,
      iconColor: "text-sky-600",
      iconBgColor: "bg-sky-50 dark:bg-sky-950",
      description: "All installation tickets",
    },
    {
      title: "Open",
      value: openRequests.length,
      icon: AlertCircle,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-50 dark:bg-amber-950",
      description: "Awaiting action",
    },
    {
      title: "In Progress",
      value: inProgressRequests.length,
      icon: Clock,
      iconColor: "text-indigo-600",
      iconBgColor: "bg-indigo-50 dark:bg-indigo-950",
      description: "Being installed",
    },
    {
      title: "Completed",
      value: resolvedRequests.length + closedRequests.length,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-50 dark:bg-emerald-950",
      description: "Successfully installed",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-foreground">
              Installation Requests
            </h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage all customer installation and setup requests
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/installation/new">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Statistics Cards */}
      <StatsGrid stats={installationStats} />

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
              <TicketsTable tickets={requests} hrefBase="/admin/installation" />
            ) : (
              requests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/admin/installation" />
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
                hrefBase="/admin/installation"
              />
            ) : (
              openRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/admin/installation" />
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
                hrefBase="/admin/installation"
              />
            ) : (
              scheduledMeetingRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/admin/installation" />
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
                hrefBase="/admin/installation"
              />
            ) : (
              waitingRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/admin/installation" />
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
                  No in-progress requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable
                tickets={inProgressRequests}
                hrefBase="/admin/installation"
              />
            ) : (
              inProgressRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/admin/installation" />
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
                hrefBase="/admin/installation"
              />
            ) : (
              resolvedRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/admin/installation" />
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
                hrefBase="/admin/installation"
              />
            ) : (
              closedRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase="/admin/installation" />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
