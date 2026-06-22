import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth-utils";
import { getTicketById } from "@/actions/tickets";
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
import { TicketStatusControl } from "@/components/admin/ticket-status-control";
import { TicketPriorityControl } from "@/components/admin/ticket-priority-control";
import { ArrowLeft, Calendar, User, Tag, Package, CheckCircle2, Globe } from "lucide-react";
import { formatDate } from "@/lib/settings-utils";
import type { User as UserType } from "@/types";
import type { SessionUser } from "@/lib/auth";

interface CustomizationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function SupportAgentCustomizationDetailPage({
  params,
}: CustomizationDetailPageProps) {
  const session = await requireAuth();
  const role = (session.user as SessionUser).role || "customer";
  if (role !== "support") {
    redirect("/unauthorized");
  }

  const { id } = await params;

  const ticketResult = await getTicketById(id);
  if (!ticketResult.success || !ticketResult.data) {
    notFound();
  }
  const request = ticketResult.data;

  if (request.category !== "feature_request") {
    notFound();
  }

  const currentUserId = session.user.id;
  const usersCollection = await getCollection<UserType>("user");
  const dbUser = await usersCollection.findOne({
    $or: [
      { id: currentUserId },
      ObjectId.isValid(currentUserId) ? { _id: new ObjectId(currentUserId) } : {},
    ].filter((q) => Object.keys(q).length > 0),
  });

  const allowedAssignedToIds = [
    currentUserId,
    dbUser?.id,
    dbUser?._id?.toString(),
  ].filter(Boolean);

  if (!allowedAssignedToIds.includes(request?.assignedToId)) {
    notFound();
  }

  const commentsResult = await getTicketComments(id);
  const comments = commentsResult.success ? commentsResult.data || [] : [];

  const fileUploadsEnabled = isFileUploadsEnabled();
  const attachmentsResult = fileUploadsEnabled
    ? await getTicketAttachments(id)
    : { success: true, data: [] };
  const attachments = attachmentsResult.success ? attachmentsResult.data || [] : [];

  const historyResult = await getTicketHistory(id);
  const history = historyResult.success ? historyResult.data || [] : [];

  const meetingsResult = await getTicketMeetings(id);
  const meetings = meetingsResult.success ? meetingsResult.data || [] : [];

  const userIds = [
    request.customerId,
    ...comments.map((c) => c.userId),
    ...attachments.map((a) => a.userId),
    ...(request.assignedToId ? [request.assignedToId] : []),
  ];
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  const stringIds = uniqueUserIds.filter((uid) => typeof uid === "string");
  const objectIds = stringIds
    .filter((uid) => ObjectId.isValid(uid))
    .map((uid) => new ObjectId(uid));

  const usersData = await usersCollection
    .find({
      $or: [
        { id: { $in: stringIds } },
        objectIds.length > 0 ? { _id: { $in: objectIds } } : {},
      ].filter((q) => Object.keys(q).length > 0),
    })
    .toArray();

  const users: Record<string, { name: string; email: string; role: string; country?: string; image?: string }> = {};
  usersData.forEach((user) => {
    const data = {
      name: user.name,
      email: user.email,
      role: user.role,
      country: user.country,
      image: user.image,
    };
    if (user.id) users[user.id] = data;
    const objectKey = user._id?.toString();
    if (objectKey) users[objectKey] = data;
  });

  const customer = users[request.customerId] || {
    name: "Unknown Customer",
    email: "",
    role: "customer",
  };

  return (
    <div className="space-y-6">
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
        <Button variant="outline" size="sm" asChild>
          <Link href="/support-agent/customization">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customizations
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketDescription description={request?.description} />
            </CardContent>
          </Card>

          <Tabs defaultValue="comments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="comments">Comments ({comments?.length})</TabsTrigger>
              <TabsTrigger value="meetings">Meetings ({meetings?.length})</TabsTrigger>
              {fileUploadsEnabled && (
                <TabsTrigger value="attachments">
                  Attachments ({attachments?.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="history">History ({history?.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="comments">
              <CommentSection
                ticketId={id}
                comments={comments}
                users={users}
                currentUserRole={(session.user as SessionUser).role || "customer"}
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
                  currentUserRole={(session.user as SessionUser).role || "customer"}
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
                    currentUserRole={(session?.user as SessionUser)?.role || "customer"}
                  />
                </div>
              </TabsContent>
            )}

            <TabsContent value="history">
              <RequestHistory history={history} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketStatusControl ticketId={id} currentStatus={request?.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketPriorityControl
                ticketId={id}
                currentPriority={request?.priority}
              />
            </CardContent>
          </Card>

          <Card>
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
                <p className="text-xs text-muted-foreground">{customer?.email}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Created</span>
                </div>
                <p className="text-sm">
                  {request?.createdAt && (await formatDate(new Date(request.createdAt)))}
                </p>
              </div>

              {request?.category && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <span className="font-medium">Category</span>
                    </div>
                    <p className="text-sm capitalize">
                      {request?.category?.replace(/_/g, " ")}
                    </p>
                  </div>
                </>
              )}

              {request?.productName && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span className="font-medium">Product</span>
                    </div>
                    <p className="text-sm">{request?.productName}</p>
                    {request?.productVersion && (
                      <p className="text-xs text-muted-foreground">
                        Version: {request?.productVersion}
                      </p>
                    )}
                  </div>
                </>
              )}

              {request?.purchaseVerification?.verified && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Purchase Verified</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      License: {request?.purchaseVerification?.licenseType}
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

