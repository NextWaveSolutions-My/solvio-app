import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/actions/services";
import { getServiceRequestsForAdmin } from "@/actions/service-requests";
import { Card, CardContent } from "@/components/ui/card";
import { StatsGrid } from "@/components/shared/stats-grid";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { EmptySearchResults } from "@/components/shared/empty-search-results";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { TicketCard } from "@/components/tickets/ticket-card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  Wrench,
} from "lucide-react";

export const dynamic = "force-dynamic";

function iconForKey(iconKey: string) {
  switch (iconKey) {
    case "wrench":
      return Wrench;
    case "download":
      return Download;
    default:
      return Briefcase;
  }
}

export default async function AdminServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    status?: string;
    priority?: string;
    search?: string;
    view?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const result = await getServiceBySlug(slug);
  if (!result.success || !result.data) notFound();

  const service = result.data;
  const Icon = iconForKey(service.iconKey);
  const viewMode = sp.view === "card" ? "card" : "table";

  const filters = { status: sp.status, priority: sp.priority, search: sp.search };
  const requestsResult = await getServiceRequestsForAdmin(slug, filters);
  const requests = requestsResult.success ? requestsResult.data || [] : [];

  const openRequests = requests.filter((r) => r.status === "open");
  const scheduledMeetingRequests = requests.filter(
    (r) => r.status === "scheduled_meeting"
  );
  const waitingRequests = requests.filter((r) => r.status === "waiting_on_customer");
  const inProgressRequests = requests.filter((r) => r.status === "in_progress");
  const resolvedRequests = requests.filter((r) => r.status === "resolved");
  const closedRequests = requests.filter((r) => r.status === "closed");

  const stats = [
    {
      title: "Total Requests",
      value: requests.length,
      icon: Icon,
      iconColor: "text-slate-600",
      iconBgColor: "bg-slate-50 dark:bg-slate-950",
      description: `All ${service.name.toLowerCase()} tickets`,
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
      description: "Being worked on",
    },
    {
      title: "Completed",
      value: resolvedRequests.length + closedRequests.length,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-50 dark:bg-emerald-950",
      description: "Resolved or closed",
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
    { value: "waiting_on_customer", label: "Waiting", count: waitingRequests.length },
    { value: "in_progress", label: "In Progress", count: inProgressRequests.length },
    { value: "resolved", label: "Resolved", count: resolvedRequests.length },
    { value: "closed", label: "Closed", count: closedRequests.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {service.name} Requests
            </h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage all customer {service.name.toLowerCase()} requests
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/admin/services/${slug}/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      <StatsGrid stats={stats} />

      <Card className="p-3 sm:p-4">
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

          <TabsContent value="all" className={viewMode === "card" ? "space-y-3" : ""}>
            {requests.length === 0 ? (
              <EmptySearchResults searchQuery={filters.search} entityName="requests" />
            ) : viewMode === "table" ? (
              <TicketsTable tickets={requests} hrefBase={`/admin/services/${slug}`} />
            ) : (
              requests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/admin/services/${slug}`} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="open" className={viewMode === "card" ? "space-y-3" : ""}>
            {openRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No open requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable tickets={openRequests} hrefBase={`/admin/services/${slug}`} />
            ) : (
              openRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/admin/services/${slug}`} />
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
                hrefBase={`/admin/services/${slug}`}
              />
            ) : (
              scheduledMeetingRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/admin/services/${slug}`} />
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
              <TicketsTable tickets={waitingRequests} hrefBase={`/admin/services/${slug}`} />
            ) : (
              waitingRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/admin/services/${slug}`} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="in_progress" className={viewMode === "card" ? "space-y-3" : ""}>
            {inProgressRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No in-progress requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable
                tickets={inProgressRequests}
                hrefBase={`/admin/services/${slug}`}
              />
            ) : (
              inProgressRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/admin/services/${slug}`} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="resolved" className={viewMode === "card" ? "space-y-3" : ""}>
            {resolvedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No resolved requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable tickets={resolvedRequests} hrefBase={`/admin/services/${slug}`} />
            ) : (
              resolvedRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/admin/services/${slug}`} />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="closed" className={viewMode === "card" ? "space-y-3" : ""}>
            {closedRequests.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No closed requests
                </CardContent>
              </Card>
            ) : viewMode === "table" ? (
              <TicketsTable tickets={closedRequests} hrefBase={`/admin/services/${slug}`} />
            ) : (
              closedRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/admin/services/${slug}`} />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
