import { notFound } from "next/navigation";
import Link from "next/link";
import { ObjectId } from "mongodb";
import { requireAuth } from "@/lib/auth-utils";
import { getTicketById } from "@/actions/tickets";
import { getTicketComments } from "@/actions/comments";
import { getTicketAttachments } from "@/actions/attachments";
import { getTicketHistory } from "@/actions/admin";
import { getTicketMeetings } from "@/actions/meetings";
import { getCollection } from "@/lib/db";
import { isFileUploadsEnabled } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/tickets/status-badge";
import { PriorityBadge } from "@/components/tickets/priority-badge";
import { RealTimeCommentSection } from "@/components/chat/real-time-comment-section";
import { FileUpload } from "@/components/attachments/file-upload";
import { AttachmentList } from "@/components/attachments/attachment-list";
import { RequestHistory } from "@/components/admin/request-history";
import { MeetingList } from "@/components/meetings/meeting-list";
import { TicketDescription } from "@/components/tickets/ticket-description";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Globe,
  Package,
  User,
} from "lucide-react";
import { formatDate } from "@/lib/settings-utils";
import type { Ticket, User as UserType } from "@/types";
import { TIMEZONES } from "@/components/ui/timezones";
import { getServiceBySlug } from "@/actions/services";

export const dynamic = "force-dynamic";

interface TicketDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function ServiceRequestDetailPage({
  params,
}: TicketDetailPageProps) {
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
  const attachments = attachmentsResult.success ? attachmentsResult.data || [] : [];

  const historyResult = await getTicketHistory(id);
  const history = historyResult.success ? historyResult.data || [] : [];

  const meetingsResult = await getTicketMeetings(id);
  const meetings = meetingsResult.success ? meetingsResult.data || [] : [];

  const usersCollection = await getCollection<UserType>("user");
  const assignedToId = typeof ticket.assignedToId === "string" ? ticket.assignedToId : null;
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

  const usersMap = new Map<string, UserType>();
  users.forEach((user) => {
    usersMap.set(user.id, user);
    usersMap.set(user._id.toString(), user);
  });

  const customer = usersMap.get(ticket.customerId);
  const assignedTo = ticket.assignedToId ? usersMap.get(ticket.assignedToId) : null;
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
    {} as Record<string, { name: string; email: string; role: string; image?: string }>
  );

  const timezoneName = ticket.timezone
    ? TIMEZONES.find((tz) => tz.value === ticket.timezone)?.label || ticket.timezone
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/services/${slug}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/services/${slug}/${id}/edit`}>Edit</Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{ticket.title}</h1>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <p className="text-muted-foreground">
              {service.name} • {ticket.ticketNumber}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{customer?.name || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">{customer?.email || ""}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned To
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{assignedTo?.name || "Unassigned"}</p>
              <p className="text-sm text-muted-foreground">{assignedTo?.email || ""}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {await formatDate(new Date(ticket.lastActivityAt || ticket.updatedAt))}
              </p>
              <p className="text-sm text-muted-foreground">Last update</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          {fileUploadsEnabled && <TabsTrigger value="attachments">Attachments</TabsTrigger>}
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <TicketDescription description={ticket.description} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Product</span>
                <span className="text-sm font-medium">{ticket.productName || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm font-medium">{ticket.productVersion || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Purchase Code</span>
                <span className="text-sm font-medium">
                  {ticket.purchaseCode ? "Provided" : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <RealTimeCommentSection
            ticketId={id}
            initialComments={comments}
            attachments={attachments}
            users={usersRecord}
            currentUserRole={(session.user as { role?: string })?.role || "customer"}
            currentUserId={session.user.id}
            fileUploadsEnabled={fileUploadsEnabled}
          />
        </TabsContent>

        {fileUploadsEnabled && (
          <TabsContent value="attachments" className="space-y-4">
            <FileUpload ticketId={id} />
            <AttachmentList
              attachments={attachments}
              users={usersRecord}
              currentUserId={session.user.id}
              currentUserRole={(session.user as { role?: string })?.role || "customer"}
            />
          </TabsContent>
        )}

        <TabsContent value="history" className="space-y-4">
          <RequestHistory history={history} />
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <MeetingList
            meetings={meetings}
            users={usersRecord}
            currentUserRole={(session.user as { role?: string })?.role || "customer"}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
