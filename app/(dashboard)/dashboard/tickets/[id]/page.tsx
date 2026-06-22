import Link from "next/link";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { getTicketById } from "@/actions/tickets";
import { getTicketHistory } from "@/actions/admin";
import { isFileUploadsEnabled } from "@/lib/storage";
import { Separator } from "@/components/ui/separator";
import { getTicketMeetings } from "@/actions/meetings";
import { getTicketComments } from "@/actions/comments";
import { getTicketAttachments } from "@/actions/attachments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { RealTimeCommentSection } from "@/components/chat/real-time-comment-section";
import { FileUpload } from "@/components/attachments/file-upload";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { RequestHistory } from "@/components/admin/request-history";
import { MeetingList } from "@/components/meetings/meeting-list";
import { TicketDescription } from "@/components/tickets/ticket-description";
import { NameWithRole } from "@/components/shared/name-with-role";
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
import { TIMEZONES } from "@/components/ui/timezones";

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({
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
    ticket.customerId,
    ...comments.map((c) => c.userId),
    ...attachments.map((a) => a.userId),
    ...(ticket.assignedToId ? [ticket.assignedToId] : []),
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

  const unresolvedIds = uniqueUserIds.filter(
    (uid) => !users[uid] && ObjectId.isValid(uid)
  );
  for (const rawId of unresolvedIds) {
    const byObjectId = await usersCollection.findOne({
      _id: new ObjectId(rawId),
    });
    if (byObjectId) {
      const entry = {
        name: byObjectId.name || "Unknown User",
        email: byObjectId.email || "",
        role: byObjectId.role || "customer",
        image: byObjectId.image,
      };
      users[rawId] = entry;
      if (byObjectId.id && !users[byObjectId.id]) {
        users[byObjectId.id] = entry;
      }
    }
  }

  // If customer is not found, try to fetch by _id (fallback for old data)
  if (!users[ticket.customerId]) {
    try {
      // Try to find user by _id if customerId looks like an ObjectId
      let customerUser = null;
      if (ObjectId.isValid(ticket.customerId)) {
        customerUser = await usersCollection.findOne({
          _id: new ObjectId(ticket.customerId),
        });
      }

      if (customerUser) {
        users[ticket.customerId] = {
          name: customerUser.name || "Unknown User",
          email: customerUser.email || "",
          role: customerUser.role || "customer",
          image: customerUser.image,
        };
      } else {
        console.warn(
          `Customer not found for ticket ${ticket.ticketNumber}. CustomerId: ${ticket.customerId}`
        );
      }
    } catch (error) {
      console.error("Error fetching customer user:", error);
    }
  }

  const customer = users[ticket.customerId] || {
    // Guest tickets (AI chatbot widget) have no user record — fall back to the
    // name/email the visitor entered in the contact form.
    name: ticket.guestName || "Unknown Customer",
    email: ticket.guestEmail || "",
    role: "customer",
  };
  const assignedTo = ticket.assignedToId ? users[ticket.assignedToId] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-muted-foreground">
              {ticket.ticketNumber}
            </span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} showIcon />
          </div>
          <h1 className="text-3xl font-bold">{ticket.title}</h1>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/tickets">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketDescription description={ticket.description} />
            </CardContent>
          </Card>

          {/* Tabs for Comments, Meetings, Attachments, and History */}
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
              <RealTimeCommentSection
                ticketId={id}
                initialComments={comments}
                attachments={attachments}
                users={users}
                currentUserRole={
                  (session.user as SessionUser).role || "customer"
                }
                currentUserId={session.user.id}
                fileUploadsEnabled={fileUploadsEnabled}
              />
            </TabsContent>

            <TabsContent value="meetings">
              <MeetingList
                meetings={meetings}
                users={users}
                currentUserRole={
                  (session.user as SessionUser).role || "customer"
                }
              />
            </TabsContent>

            {fileUploadsEnabled && (
              <TabsContent value="attachments" className="space-y-4">
                <FileUpload ticketId={id} />
                <AttachmentList
                  attachments={attachments}
                  users={users}
                  currentUserId={session.user.id}
                  currentUserRole={
                    (session.user as SessionUser).role || "customer"
                  }
                />
              </TabsContent>
            )}

            <TabsContent value="history">
              <RequestHistory history={history} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
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
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Created</span>
                </div>
                <p className="text-sm">
                  {ticket.createdAt &&
                    (await formatDate(new Date(ticket.createdAt)))}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">Last Updated</span>
                </div>
                <p className="text-sm">
                  {ticket.updatedAt &&
                    (await formatDate(new Date(ticket.updatedAt)))}
                </p>
              </div>

              {ticket.category && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Tag className="h-4 w-4" />
                      <span className="font-medium">Category</span>
                    </div>
                    <p className="text-sm capitalize">
                      {ticket.category.replace("_", " ")}
                    </p>
                  </div>
                </>
              )}

              {assignedTo && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="font-medium">Assigned To</span>
                    </div>
                    <p className="text-sm">
                      <NameWithRole
                        name={assignedTo?.name}
                        role={(assignedTo as { role?: string })?.role}
                        className="text-sm"
                        badgeClassName="h-4 px-2 text-[10px]"
                      />
                    </p>
                  </div>
                </>
              )}

              {ticket.resolvedAt && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Resolved</span>
                    </div>
                    <p className="text-sm">
                      {ticket.resolvedAt &&
                        (await formatDate(new Date(ticket.resolvedAt)))}
                    </p>
                  </div>
                </>
              )}

              {ticket.timezone && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <span className="font-medium">Timezone</span>
                    </div>
                    <p className="text-sm">
                      {TIMEZONES.find((tz) => tz.value === ticket.timezone)
                        ?.label || ticket.timezone}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Product Information (if available) */}
          {(ticket.productName ||
            ticket.productVersion ||
            ticket.purchaseCode) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Product Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {ticket.productName && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Product Name
                    </p>
                    <p className="text-sm font-medium">{ticket.productName}</p>
                  </div>
                )}

                {ticket.productVersion && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Version</p>
                      <p className="text-sm font-medium">
                        {ticket.productVersion}
                      </p>
                    </div>
                  </>
                )}

                {ticket.purchaseCode && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Purchase Code
                      </p>
                      <p className="text-xs font-mono break-all bg-muted p-2 rounded border">
                        {ticket.purchaseCode}
                      </p>
                    </div>
                  </>
                )}

                {/* Purchase Verification Details */}
                {ticket.purchaseVerification && (
                  <>
                    <Separator />
                    <div className="space-y-3 bg-success/10 p-3 rounded-lg border border-success/20">
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm font-semibold">
                          Purchase Verified
                        </span>
                      </div>

                      {ticket.purchaseVerification.buyer && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Buyer</p>
                          <p className="text-sm font-medium">
                            {ticket.purchaseVerification.buyer}
                          </p>
                        </div>
                      )}

                      {ticket.purchaseVerification.itemName && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Item</p>
                          <p className="text-sm font-medium">
                            {ticket.purchaseVerification.itemName}
                          </p>
                        </div>
                      )}

                      {ticket.purchaseVerification.licenseType && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            License
                          </p>
                          <p className="text-sm font-medium">
                            {ticket.purchaseVerification.licenseType}
                          </p>
                        </div>
                      )}

                      {ticket.purchaseVerification.purchaseDate && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Purchase Date
                          </p>
                          <p className="text-sm">
                            {await formatDate(
                              new Date(ticket.purchaseVerification.purchaseDate)
                            )}
                          </p>
                        </div>
                      )}

                      {ticket.purchaseVerification.supportedUntil && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">
                            Support Valid Until
                          </p>
                          <p className="text-sm">
                            {await formatDate(
                              new Date(
                                ticket.purchaseVerification.supportedUntil
                              )
                            )}
                          </p>
                          {new Date(
                            ticket.purchaseVerification.supportedUntil
                          ) < new Date() && (
                            <p className="text-xs text-destructive font-medium">
                              ⚠️ Support has expired
                            </p>
                          )}
                        </div>
                      )}
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
