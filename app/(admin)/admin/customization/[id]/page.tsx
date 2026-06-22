import Link from "next/link";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { requireAuth } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/settings-utils";
import { getTicketById } from "@/actions/tickets";
import { getTicketHistory } from "@/actions/admin";
import { notFound, redirect } from "next/navigation";
import { isFileUploadsEnabled } from "@/lib/storage";
import { Separator } from "@/components/ui/separator";
import { getTicketComments } from "@/actions/comments";
import { getTicketMeetings } from "@/actions/meetings";
import { getTicketAttachments } from "@/actions/attachments";
import { StatusBadge } from "@/components/tickets/status-badge";
import { MeetingList } from "@/components/meetings/meeting-list";
import { FileUpload } from "@/components/attachments/file-upload";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { RequestHistory } from "@/components/admin/request-history";
import { CommentSection } from "@/components/tickets/comment-section";
import { TicketAssignment } from "@/components/admin/ticket-assignment";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { MeetingScheduler } from "@/components/meetings/meeting-scheduler";
import { TicketStatusControl } from "@/components/admin/ticket-status-control";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomizationActions } from "@/components/admin/customization-actions";
import { TicketPriorityControl } from "@/components/admin/ticket-priority-control";
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Package,
  Globe,
} from "lucide-react";
import { TIMEZONES } from "@/components/ui/timezones";

interface CustomizationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomizationDetailPage({
  params,
}: CustomizationDetailPageProps) {
  const session = await requireAuth();
  const { id } = await params;

  // Get request
  const requestResult = await getTicketById(id);
  if (!requestResult.success || !requestResult.data) {
    notFound();
  }
  const request = requestResult.data;

  // Verify it's a customization request
  if (request.category !== "feature_request") {
    redirect(`/admin/tickets/${id}`);
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

  // Get all users for assignment and display
  const usersCollection = await getCollection("user");
  const allUsers = await usersCollection.find({}).toArray();
  const supportUsers = allUsers.filter(
    (u) =>
      (u as { role?: string }).role === "admin" ||
      (u as { role?: string }).role === "support"
  );

  // Create users map
  const userIds = [
    ...new Set([
      request.customerId,
      ...(request.assignedToId ? [request.assignedToId] : []),
      ...comments.map((c) => c.userId),
    ]),
  ];

  const stringIds = userIds.filter((id) => typeof id === "string");
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
    { name: string; email: string; role: string; image?: string }
  > = {};
  usersData.forEach((user) => {
    const key = user.id || user._id?.toString();
    users[key] = {
      name: user.name,
      email: user.email,
      role: user.role || "customer",
      image: user.image,
    };
  });

  const customer = users[request.customerId] || {
    name: "Unknown Customer",
    email: "",
    role: "customer",
  };
  const assignedTo = request.assignedToId ? users[request.assignedToId] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-muted-foreground">
              {request?.ticketNumber}
            </span>
            <StatusBadge status={request?.status} />
            <PriorityBadge priority={request?.priority} />
          </div>
          <h1 className="text-3xl font-bold">{request?.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <CustomizationActions requestId={id} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/customization">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Customizations
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Description */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">{request.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Comments, Attachments, Meetings, and History */}
          <Tabs defaultValue="comments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="comments">
                Comments ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="meetings">
                Meetings ({meetings.length})
              </TabsTrigger>
              {fileUploadsEnabled && (
                <TabsTrigger value="attachments">
                  Attachments ({attachments.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="history">
                History ({history.length})
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
                    currentUserId={session.user.id}
                    currentUserRole={
                      (session.user as SessionUser).role || "customer"
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
          {/* Request Information */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="font-medium">Customer</span>
                </div>
                <p className="text-sm">{customer?.name || "Unknown"}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Created</span>
                </div>
                <p className="text-sm">
                  {await formatDate(new Date(request.createdAt))}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Last Updated</span>
                </div>
                <p className="text-sm">
                  {await formatDate(new Date(request.lastActivityAt))}
                </p>
              </div>

              {request.productName && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">Product</span>
                    </div>
                    <p className="text-sm">
                      {request.productName}
                      {request.productVersion && ` v${request.productVersion}`}
                    </p>
                  </div>
                </>
              )}

              {request.tags && request.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <span className="font-medium">Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {request.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-muted rounded-md text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {request.timezone && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Timezone</span>
                    </div>
                    <p className="text-sm">
                      {TIMEZONES.find((tz) => tz.value === request.timezone)
                        ?.label || request.timezone}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Admin Controls */}
          <Card className="gap-2">
            <CardHeader>
              <CardTitle>Admin Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <TicketStatusControl
                  ticketId={id}
                  currentStatus={request.status}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <TicketPriorityControl
                  ticketId={id}
                  currentPriority={request.priority}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <label className="text-sm font-medium">Assigned To</label>
                <TicketAssignment
                  ticketId={id}
                  currentAssignedToId={
                    typeof request.assignedToId === "string"
                      ? request.assignedToId
                      : null
                  }
                  supportStaff={supportUsers.map((u) => ({
                    id: u.id || u._id?.toString(),
                    name: u.name,
                    email: u.email,
                    role: u.role || "customer",
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
