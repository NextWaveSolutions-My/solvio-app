import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { StatsGrid } from "@/components/shared/stats-grid";
import { ViewToggle } from "@/components/tickets/view-toggle";
import { TicketCard } from "@/components/tickets/ticket-card";
import { TicketsTable } from "@/components/tickets/tickets-table";
import { PageTabsHeader } from "@/components/shared/page-tabs-header";
import { EmptySearchResults } from "@/components/shared/empty-search-results";
import { getMyServiceRequests } from "@/actions/service-requests";
import { getServiceBySlug } from "@/actions/services";
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

export default async function DashboardServicePage({
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
  await requireAuth();
  const { slug } = await params;
  const sp = await searchParams;

  const serviceResult = await getServiceBySlug(slug);
  if (!serviceResult.success || !serviceResult.data) notFound();
  const service = serviceResult.data;
  const Icon = iconForKey(service.iconKey);

  const filters = {
    status: sp.status,
    priority: sp.priority,
    search: sp.search,
  };
  const viewMode = sp.view === "card" ? "card" : "table";

  const requestsResult = await getMyServiceRequests(slug, filters);
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
      title: "Open",
      value: openRequests.length,
      icon: AlertCircle,
      iconColor: "text-blue-600",
      iconBgColor: "bg-blue-50 dark:bg-blue-950",
      description: "Awaiting action",
    },
    {
      title: "In Progress",
      value: inProgressRequests.length,
      icon: Clock,
      iconColor: "text-amber-600",
      iconBgColor: "bg-amber-50 dark:bg-amber-950",
      description: "Currently being worked on",
    },
    {
      title: "Resolved",
      value: resolvedRequests.length,
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      iconBgColor: "bg-emerald-50 dark:bg-emerald-950",
      description: "Completed successfully",
    },
    {
      title: "All",
      value: requests.length,
      icon: Icon,
      iconColor: "text-slate-600",
      iconBgColor: "bg-slate-50 dark:bg-slate-950",
      description: "All your requests",
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
      <div className="flex justify-between items-start">
        <div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-foreground">{service.name}</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage your {service.name.toLowerCase()} requests
          </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/services/${slug}/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Link>
        </Button>
      </div>

      <StatsGrid stats={stats} />

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

          <TabsContent value="all" className={viewMode === "card" ? "space-y-3" : ""}>
            {requests.length === 0 ? (
              <EmptySearchResults searchQuery={filters.search} entityName="requests" />
            ) : viewMode === "table" ? (
              <TicketsTable tickets={requests} hrefBase={`/dashboard/services/${slug}`} />
            ) : (
              requests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/dashboard/services/${slug}`} />
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
              <TicketsTable tickets={openRequests} hrefBase={`/dashboard/services/${slug}`} />
            ) : (
              openRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/dashboard/services/${slug}`} />
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
                hrefBase={`/dashboard/services/${slug}`}
              />
            ) : (
              scheduledMeetingRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/dashboard/services/${slug}`} />
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
              <TicketsTable tickets={waitingRequests} hrefBase={`/dashboard/services/${slug}`} />
            ) : (
              waitingRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/dashboard/services/${slug}`} />
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
                hrefBase={`/dashboard/services/${slug}`}
              />
            ) : (
              inProgressRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/dashboard/services/${slug}`} />
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
              <TicketsTable tickets={resolvedRequests} hrefBase={`/dashboard/services/${slug}`} />
            ) : (
              resolvedRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/dashboard/services/${slug}`} />
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
              <TicketsTable tickets={closedRequests} hrefBase={`/dashboard/services/${slug}`} />
            ) : (
              closedRequests.map((request) => (
                <div key={request._id.toString()}>
                  <TicketCard ticket={request} hrefBase={`/dashboard/services/${slug}`} />
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
