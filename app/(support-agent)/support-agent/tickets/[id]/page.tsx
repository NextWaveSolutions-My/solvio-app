import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { getTicketById } from "@/actions/tickets";
import { ObjectId } from "mongodb";
import { getTicketComments } from "@/actions/comments";
import { getTicketAttachments } from "@/actions/attachments";
import { getTicketHistory } from "@/actions/admin";
import { getTicketMeetings } from "@/actions/meetings";
import { isFileUploadsEnabled } from "@/lib/storage";
import { getCollection } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { CommentSection } from "@/components/tickets/comment-section";
import { FileUpload } from "@/components/attachments/file-upload";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { RequestHistory } from "@/components/admin/request-history";
import { MeetingList } from "@/components/meetings/meeting-list";
import { MeetingScheduler } from "@/components/meetings/meeting-scheduler";
import { TicketDescription } from "@/components/tickets/ticket-description";
import { NameWithRole } from "@/components/shared/name-with-role";
import { TicketStatusControl } from "@/components/admin/ticket-status-control";
import { TicketPriorityControl } from "@/components/admin/ticket-priority-control";
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Package,
  CheckCircle2,
  Globe,
} from "lucide-react";
import { formatDate } from "@/lib/settings-utils";
import type { User as UserType } from "@/types";
import type { SessionUser } from "@/lib/auth";

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupportAgentTicketDetailPage({
  params,
}: TicketDetailPageProps) {
  const session = await requireAuth();
  const { id } = await params;

  // Get ticket
  const ticketResult = await getTicketById(id);
  if (!ticketResult.success || !ticketResult.data) {
    notFound();
  }
  const ticket = ticketResult.data;

  // Verify this ticket is assigned to the current support agent
  const currentUserId = session.user.id;
  const usersCollection = await getCollection<UserType>("user");
  const dbUser = await usersCollection.findOne({
    $or: [
      { id: currentUserId },
      ObjectId.isValid(currentUserId)
        ? { _id: new ObjectId(currentUserId) }
        : {},
    ].filter((q) => Object.keys(q).length > 0),
  });

  const allowedAssignedToIds = [
    currentUserId,
    dbUser?.id,
    dbUser?._id?.toString(),
  ].filter(Boolean);

  if (!allowedAssignedToIds.includes(ticket?.assignedToId)) {
    notFound(); // Support agents can only view their assigned tickets
  }

  // Get comments
  const commentsResult = await getTicketComments(id);
  const comments = commentsResult.success ? commentsResult.data || [] : [];

  // Get attachments (if file uploads are enabled)
  const fileUploadsEnabled = isFileUploadsEnabled();
  const attachmentsResult = fileUploadsEnabled
    ? await getTicketAttachments(id)
    : { success: true, data: [] };
  const attachments = attachmentsResult.success
    ? attachmentsResult.data || []
    : [];

  // Get history
  const historyResult = await getTicketHistory(id);
  const history = historyResult.success ? historyResult.data || [] : [];

  // Get meetings
  const meetingsResult = await getTicketMeetings(id);
  const meetings = meetingsResult.success ? meetingsResult.data || [] : [];

  // Get user information
  const userIds = [
    ticket?.customerId,
    ...comments?.map((c) => c.userId),
    ...attachments?.map((a) => a.userId),
    ...(ticket?.assignedToId ? [ticket.assignedToId] : []),
  ];
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  const stringIds = uniqueUserIds.filter((id) => typeof id === "string");
  const objectIds = stringIds
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const usersData = await usersCollection
    .find({
      $or: [
        { id: { $in: stringIds } },
        objectIds.length > 0 ? { _id: { $in: objectIds } } : {},
      ].filter((q) => Object.keys(q).length > 0),
    })
    .toArray();

  const users: Record<
    string,
    { name: string; email: string; role: string; country?: string }
  > = {};
  usersData.forEach((user) => {
    const data = {
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country,
    };

    const idKey = user.id;
    if (idKey) users[idKey] = data;

    const objectKey = user._id?.toString();
    if (objectKey) users[objectKey] = data;
  });

  const customer = users[ticket?.customerId] || {
    // Guest tickets (AI chatbot widget) have no user record — fall back to the
    // name/email the visitor entered in the contact form.
    name: ticket?.guestName || "Unknown Customer",
    email: ticket?.guestEmail || "",
    role: "customer",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-muted-foreground">
              {ticket?.ticketNumber}
            </span>
            <StatusBadge status={ticket?.status} />
            <PriorityBadge priority={ticket?.priority} />
          </div>
          <h1 className="text-3xl font-bold">{ticket?.title}</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/support-agent/tickets">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tickets
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketDescription description={ticket?.description} />
            </CardContent>
          </Card>

          {/* Tabs for Comments, Attachments, Meetings, and History */}
          <Tabs defaultValue="comments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="comments">
                Comments ({comments?.length})
              </TabsTrigger>
              <TabsTrigger value="meetings">
                Meetings ({meetings?.length})
              </TabsTrigger>
              {fileUploadsEnabled && (
                <TabsTrigger value="attachments">
                  Attachments ({attachments?.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="history">
                History ({history?.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments">
              <CommentSection
                ticketId={id}
                comments={comments}
                users={users}
                currentUserRole={
                  (session.user as SessionUser).role || "customer"
                }
                currentUserId={session.user.id}
              />
            </TabsContent>

            <TabsContent value="meetings">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3">
                  <p className="text-sm text-muted-foreground">
                    Schedule a Zoom or Google Meet with the customer.
                  </p>
                  <MeetingScheduler ticketId={id} />
                </div>
                <MeetingList
                  meetings={meetings}
                  users={users}
                  currentUserRole={
                    (session.user as SessionUser).role || "customer"
                  }
                />
              </div>
            </TabsContent>

            {fileUploadsEnabled && (
              <TabsContent value="attachments">
                <div className="space-y-4">
                  <FileUpload ticketId={id} />
                  <AttachmentList
                    attachments={attachments}
                    users={users}
                    currentUserId={currentUserId}
                    currentUserRole={
                      (session?.user as SessionUser)?.role || "customer"
                    }
                  />
                </div>
              </TabsContent>
            )}

            <TabsContent value="history">
              <RequestHistory history={history} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Control */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketStatusControl
                ticketId={id}
                currentStatus={ticket?.status}
              />
            </CardContent>
          </Card>

          {/* Priority Control */}
          <Card>
            <CardHeader>
              <CardTitle>Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketPriorityControl
                ticketId={id}
                currentPriority={ticket?.priority}
              />
            </CardContent>
          </Card>

          {/* Ticket Information */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Customer</span>
                </div>
                <p className="text-sm">
                  <NameWithRole
                    name={customer?.name}
                    role={(customer as { role?: string })?.role}
                    className="text-sm"
                    badgeClassName="h-4 px-2 text-[10px]"
                  />
                </p>
                <p className="text-xs text-muted-foreground">
                  {customer?.email}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Created</span>
                </div>
                <p className="text-sm">
                  {ticket?.createdAt &&
                    (await formatDate(new Date(ticket.createdAt)))}
                </p>
              </div>

              {ticket?.category && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <span className="font-medium">Category</span>
                    </div>
                    <p className="text-sm capitalize">
                      {ticket?.category?.replace(/_/g, " ")}
                    </p>
                  </div>
                </>
              )}

              {ticket?.productName && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">Product</span>
                    </div>
                    <p className="text-sm">{ticket?.productName}</p>
                    {ticket?.productVersion && (
                      <p className="text-xs text-muted-foreground">
                        Version: {ticket?.productVersion}
                      </p>
                    )}
                  </div>
                </>
              )}

              {ticket?.purchaseVerification?.verified && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Purchase Verified</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      License: {ticket?.purchaseVerification?.licenseType}
                    </p>
                  </div>
                </>
              )}

              {customer?.country && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Country</span>
                    </div>
                    <p className="text-sm">{customer.country}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
