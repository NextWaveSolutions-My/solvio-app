import Link from "next/link";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import type { Ticket, User as UserType } from "@/types";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/settings-utils";
import { getTicketById } from "@/actions/tickets";
import { getTicketHistory } from "@/actions/admin";
import { isFileUploadsEnabled } from "@/lib/storage";
import { Separator } from "@/components/ui/separator";
import { getTicketComments } from "@/actions/comments";
import { getTicketMeetings } from "@/actions/meetings";
import { getTicketAttachments } from "@/actions/attachments";
import { StatusBadge } from "@/components/tickets/status-badge";
import { FileUpload } from "@/components/attachments/file-upload";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { CommentSection } from "@/components/tickets/comment-section";
import { TicketAssignment } from "@/components/admin/ticket-assignment";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketStatusControl } from "@/components/admin/ticket-status-control";
import { TicketPriorityControl } from "@/components/admin/ticket-priority-control";
import { RequestHistory } from "@/components/admin/request-history";
import { MeetingScheduler } from "@/components/meetings/meeting-scheduler";
import { MeetingList } from "@/components/meetings/meeting-list";
import { TicketDescription } from "@/components/tickets/ticket-description";
import { NameWithRole } from "@/components/shared/name-with-role";
import { ArrowLeft, Calendar, Globe, Package, User } from "lucide-react";
import { TIMEZONES } from "@/components/ui/timezones";
import { getServiceBySlug } from "@/actions/services";

export const dynamic = "force-dynamic";

export default async function AdminServiceRequestDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const session = await requireAuth();
  const { id, slug } = await params;

  const serviceResult = await getServiceBySlug(slug);
  if (!serviceResult.success || !serviceResult.data) notFound();
  const service = serviceResult.data;

  const ticketResult = await getTicketById(id);
  if (!ticketResult.success || !ticketResult.data) notFound();
  const ticket = ticketResult.data as Ticket;

  const isMatchingService =
    (ticket.category === "service" && ticket.serviceSlug === slug) ||
    (slug === "customization" && ticket.category === "feature_request") ||
    (slug === "installation" && ticket.category === "technical_support");
  if (!isMatchingService) notFound();

  const commentsResult = await getTicketComments(id);
  const comments = commentsResult.success ? commentsResult.data || [] : [];

  const fileUploadsEnabled = isFileUploadsEnabled();
  const attachmentsResult = fileUploadsEnabled
    ? await getTicketAttachments(id)
    : { success: true, data: [] };
  const attachments = attachmentsResult.success
    ? attachmentsResult.data || []
    : [];

  const historyResult = await getTicketHistory(id);
  const history = historyResult.success ? historyResult.data || [] : [];

  const meetingsResult = await getTicketMeetings(id);
  const meetings = meetingsResult.success ? meetingsResult.data || [] : [];

  const usersCollection = await getCollection<UserType>("user");
  const assignedToId =
    typeof ticket.assignedToId === "string" ? ticket.assignedToId : null;
  const userIds = [
    ticket.customerId,
    ...comments.map((c) => c.userId),
    ...attachments.map((a) => a.userId),
    ...(assignedToId ? [assignedToId] : []),
  ];

  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  const users = await usersCollection
    .find({
      $or: [
        { id: { $in: uniqueUserIds } },
        {
          _id: {
            $in: uniqueUserIds
              .filter((uid) => ObjectId.isValid(uid))
              .map((uid) => new ObjectId(uid)),
          },
        },
      ],
    })
    .toArray();

  const supportStaff = await usersCollection
    .find({ role: { $in: ["admin", "support"] } })
    .toArray();

  const usersMap = new Map<string, UserType>();
  users.forEach((user) => {
    usersMap.set(user.id, user);
    usersMap.set(user._id.toString(), user);
  });

  const customer = usersMap.get(ticket.customerId);
  const assignedTo = ticket.assignedToId
    ? usersMap.get(ticket.assignedToId)
    : null;
  const usersRecord = users.reduce(
    (acc, user) => {
      const key = user.id || user._id.toString();
      acc[key] = {
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      };
      return acc;
    },
    {} as Record<
      string,
      { name: string; email: string; role: string; image?: string }
    >,
  );

  const timezoneName = ticket.timezone
    ? TIMEZONES.find((tz) => tz.value === ticket.timezone)?.label ||
      ticket.timezone
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl font-bold sm:text-2xl">{ticket.title}</h1>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <p className="text-muted-foreground">
              {service.name} • {ticket.ticketNumber}
            </p>
          </div>
          <div className="flex w-full items-center justify-between sm:w-auto">
            <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
              <Link href={`/admin/services/${slug}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                <NameWithRole
                  name={customer?.name}
                  role={(customer as { role?: string })?.role}
                  className="font-medium"
                  badgeClassName="h-4 px-2 text-[10px]"
                />
              </p>
              <p className="text-sm text-muted-foreground">
                {customer?.email || ""}
              </p>
            </CardContent>
          </Card>

          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {await formatDate(new Date(ticket.createdAt))}
              </p>
              {timezoneName && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {timezoneName}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned To
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                <NameWithRole
                  name={assignedTo?.name}
                  role={(assignedTo as { role?: string })?.role}
                  className="font-medium"
                  badgeClassName="h-4 px-2 text-[10px]"
                />
              </p>
              <p className="text-sm text-muted-foreground">
                {assignedTo?.email || ""}
              </p>
            </CardContent>
          </Card>
          <Card className="gap-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Product
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{ticket.productName || "—"}</p>
              <p className="text-sm text-muted-foreground">
                {ticket.productVersion || "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="space-y-4">
            <div className="w-full overflow-x-auto">
              <TabsList className="min-w-max">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="comments">Comments</TabsTrigger>
                {fileUploadsEnabled && (
                  <TabsTrigger value="attachments">Attachments</TabsTrigger>
                )}
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="meetings">Meetings</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="details" className="space-y-4">
              <TicketDescription description={ticket.description} />
            </TabsContent>

            <TabsContent value="comments" className="space-y-4">
              <CommentSection
                ticketId={id}
                comments={comments}
                users={usersRecord}
                currentUserRole={
                  (session.user as { role?: string })?.role || "customer"
                }
                currentUserId={session.user.id}
              />
            </TabsContent>

            {fileUploadsEnabled && (
              <TabsContent value="attachments" className="space-y-4">
                <FileUpload ticketId={id} />
                <AttachmentList
                  attachments={attachments}
                  users={usersRecord}
                  currentUserId={session.user.id}
                  currentUserRole={
                    (session.user as { role?: string })?.role || "customer"
                  }
                />
              </TabsContent>
            )}

            <TabsContent value="history" className="space-y-4">
              <RequestHistory history={history} />
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4">
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3">
                <p className="text-sm text-muted-foreground">
                  Schedule a Zoom or Google Meet with the customer.
                </p>
                <MeetingScheduler ticketId={id} />
              </div>
              <MeetingList
                meetings={meetings}
                users={usersRecord}
                currentUserRole={
                  (session.user as { role?: string })?.role || "customer"
                }
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <TicketStatusControl
                ticketId={id}
                currentStatus={ticket.status}
              />
              <TicketPriorityControl
                ticketId={id}
                currentPriority={ticket.priority}
              />
              <TicketAssignment
                ticketId={id}
                currentAssignedToId={assignedToId}
                supportStaff={supportStaff.map((user) => ({
                  id: user.id || user._id.toString(),
                  name: user.name,
                  email: user.email,
                }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
