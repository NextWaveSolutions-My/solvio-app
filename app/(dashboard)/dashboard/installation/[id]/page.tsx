import Link from "next/link";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { getTicketById } from "@/actions/tickets";
import { isFileUploadsEnabled } from "@/lib/storage";
import { Separator } from "@/components/ui/separator";
import { getTicketComments } from "@/actions/comments";
import { getTicketAttachments } from "@/actions/attachments";
import { getTicketHistory } from "@/actions/admin";
import { getTicketMeetings } from "@/actions/meetings";
import { StatusBadge } from "@/components/tickets/status-badge";
import { FileUpload } from "@/components/attachments/file-upload";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { CommentSection } from "@/components/tickets/comment-section";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { RequestHistory } from "@/components/admin/request-history";
import { MeetingList } from "@/components/meetings/meeting-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Package,
  Edit,
  Globe,
} from "lucide-react";
import { formatDate } from "@/lib/settings-utils";
import type { User as UserType } from "@/types";
import type { SessionUser } from "@/lib/auth";
import { TIMEZONES } from "@/components/ui/timezones";

interface InstallationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function InstallationDetailPage({
  params,
}: InstallationDetailPageProps) {
  const session = await requireAuth();
  const { id } = await params;

  // Get installation request (ticket)
  const ticketResult = await getTicketById(id);
  if (!ticketResult.success || !ticketResult.data) {
    notFound();
  }
  const installation = ticketResult.data;

  // Verify it's an installation request (technical_support category)
  if (installation.category !== "technical_support") {
    notFound();
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

  // Get user information for comments and attachments
  const usersCollection = await getCollection<UserType>("user");
  const userIds = [
    installation.customerId,
    ...comments.map((c) => c.userId),
    ...attachments.map((a) => a.userId),
    ...(installation.assignedToId ? [installation.assignedToId] : []),
  ];
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  const usersData = await usersCollection
    .find({ id: { $in: uniqueUserIds } })
    .toArray();

  const users: Record<
    string,
    { name: string; email: string; role: string; image?: string }
  > = {};
  usersData.forEach((user) => {
    users[user.id] = {
      name: user.name || "Unknown User",
      email: user.email || "",
      role: user.role || "customer",
      image: user.image,
    };
  });

  // If customer is not found, try to fetch by _id (fallback for old data)
  if (!users[installation.customerId]) {
    try {
      let customerUser = null;
      if (ObjectId.isValid(installation.customerId)) {
        customerUser = await usersCollection.findOne({
          _id: new ObjectId(installation.customerId),
        });
      }

      if (customerUser) {
        users[installation.customerId] = {
          name: customerUser.name || "Unknown User",
          email: customerUser.email || "",
          role: customerUser.role || "customer",
          image: customerUser.image,
        };
      }
    } catch (error) {
      console.error("Error fetching customer user:", error);
    }
  }

  const customer = users[installation.customerId] || {
    name: "Unknown Customer",
    email: "",
    role: "customer",
  };
  const assignedTo = installation.assignedToId
    ? users[installation.assignedToId]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-muted-foreground">
              {installation.ticketNumber}
            </span>
            <StatusBadge status={installation.status} />
            <PriorityBadge priority={installation.priority} showIcon />
          </div>
          <div className="mt-2">
            <h1 className="text-3xl font-bold">{installation.title}</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" asChild>
            <Link href={`/dashboard/installation/${id}/edit`}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/installation">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to List
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Installation Description */}
          <Card>
            <CardHeader>
              <CardTitle>Installation Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-foreground">
                {installation.description}
              </p>
            </CardContent>
          </Card>

          {/* Tabs for Comments, Meetings, Attachments, and History */}
          <Tabs defaultValue="comments" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="comments">
                Comments ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="meetings">
                Meetings ({meetings.length})
              </TabsTrigger>
              <TabsTrigger value="attachments">
                Attachments ({attachments.length})
              </TabsTrigger>
              <TabsTrigger value="history">
                History ({history.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="space-y-4">
              <CommentSection
                ticketId={id}
                comments={comments}
                users={users}
                currentUserRole={(session.user as SessionUser).role}
                currentUserId={session.user.id}
              />
            </TabsContent>

            <TabsContent value="meetings" className="space-y-4">
              <MeetingList
                meetings={meetings}
                users={users}
                currentUserRole={
                  (session.user as SessionUser).role || "customer"
                }
              />
            </TabsContent>

            <TabsContent value="attachments" className="space-y-4">
              {fileUploadsEnabled ? (
                <>
                  <AttachmentList
                    attachments={attachments}
                    users={users}
                    currentUserId={session.user.id}
                    currentUserRole={
                      (session.user as SessionUser).role || "customer"
                    }
                  />
                  <Card>
                    <CardHeader>
                      <CardTitle>Upload New Attachments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FileUpload ticketId={id} />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    File uploads are currently disabled
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <RequestHistory history={history} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Request Information */}
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
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Created</span>
                </div>
                <p className="text-sm">
                  {installation.createdAt &&
                    (await formatDate(new Date(installation.createdAt)))}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Last Updated</span>
                </div>
                <p className="text-sm">
                  {installation.lastActivityAt &&
                    (await formatDate(new Date(installation.lastActivityAt)))}
                </p>
              </div>

              {assignedTo && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="font-medium">Assigned To</span>
                    </div>
                    <p className="text-sm">{assignedTo.name}</p>
                  </div>
                </>
              )}

              {installation.tags && installation.tags.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <span className="font-medium">Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {installation.tags.map((tag) => (
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

              {installation.timezone && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Timezone</span>
                    </div>
                    <p className="text-sm">
                      {TIMEZONES.find(
                        (tz) => tz.value === installation.timezone
                      )?.label || installation.timezone}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Product Information (if available) */}
          {(installation.productName ||
            installation.productVersion ||
            installation.purchaseCode) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Product Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {installation.productName && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Product Name
                    </p>
                    <p className="text-sm font-medium">
                      {installation.productName}
                    </p>
                  </div>
                )}

                {installation.productVersion && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Version</p>
                      <p className="text-sm font-medium">
                        {installation.productVersion}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
