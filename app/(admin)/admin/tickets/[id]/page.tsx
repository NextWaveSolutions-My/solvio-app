import Link from "next/link";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { notFound } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { requireAuth } from "@/lib/auth-utils";
import type {
  TicketDepartmentDefinition,
  TicketProductDefinition,
  User as UserType,
} from "@/types";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/settings-utils";
import { getTicketById } from "@/actions/tickets";
import { getTicketHistory } from "@/actions/admin";
import { isFileUploadsEnabled } from "@/lib/storage";
import { getTicketComments } from "@/actions/comments";
import { getTicketMeetings } from "@/actions/meetings";
import { getTicketAttachments } from "@/actions/attachments";
import { CommentSection } from "@/components/tickets/comment-section";
import { TicketAssignment } from "@/components/admin/ticket-assignment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketStatusControl } from "@/components/admin/ticket-status-control";
import { TicketPriorityControl } from "@/components/admin/ticket-priority-control";
import { RequestHistory } from "@/components/admin/request-history";
import { MeetingScheduler } from "@/components/meetings/meeting-scheduler";
import { MeetingList } from "@/components/meetings/meeting-list";
import { TicketDescription } from "@/components/tickets/ticket-description";
import { NameWithRole } from "@/components/shared/name-with-role";
import { ArrowLeft } from "lucide-react";

interface AdminTicketDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminTicketDetailPage({
  params,
}: AdminTicketDetailPageProps) {
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

  // Get user information
  const usersCollection = await getCollection<UserType>("user");
  const assignedToId =
    typeof ticket.assignedToId === "string" ? ticket.assignedToId : null;
  const userIds = [
    ticket.customerId,
    ...comments.map((c) => c.userId),
    ...attachments.map((a) => a.userId),
    ...(assignedToId ? [assignedToId] : []),
  ];
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);

  const objectIds = uniqueUserIds
    .filter((id) => typeof id === "string" && ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const usersData = await usersCollection
    .find({
      $or: [
        { id: { $in: uniqueUserIds } },
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
    if (key) {
      users[key] = {
        name: user.name || "Unknown User",
        email: user.email || "",
        role: user.role || "customer",
        image: user.image,
      };
    }

    const objectKey = user._id?.toString();
    if (objectKey && !users[objectKey]) {
      users[objectKey] = {
        name: user.name || "Unknown User",
        email: user.email || "",
        role: user.role || "customer",
        image: user.image,
      };
    }
  });

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

  // Get support staff for assignment
  const supportStaff = await usersCollection
    .find({ role: { $in: ["support", "admin"] } })
    .toArray();

  // Resolve department name
  let departmentName: string | null = null;
  if (ticket.departmentSlug) {
    const departmentsCollection =
      await getCollection<TicketDepartmentDefinition>("ticket_departments");
    const dept = await departmentsCollection.findOne({ slug: ticket.departmentSlug });
    departmentName = dept?.name || ticket.departmentSlug;
  }

  // Resolve product from admin-managed ticket_products catalog
  let productLabel: string | null = null;
  if (ticket.productSlug) {
    const productsCollection = await getCollection<TicketProductDefinition>(
      "ticket_products"
    );
    const product = await productsCollection.findOne({ slug: ticket.productSlug });
    productLabel = product?.name || ticket.productSlug;
  }

  const customer = users[ticket.customerId] || {
    // Guest tickets (AI chatbot widget) have no user record — fall back to the
    // name/email the visitor entered in the contact form.
    name: ticket.guestName || "Unknown Customer",
    email: ticket.guestEmail || "",
    role: "customer",
  };
  const assignedTo = assignedToId ? users[assignedToId] : null;

  const createdLabel = ticket.createdAt
    ? await formatDate(new Date(ticket.createdAt))
    : null;
  const lastActivityLabel = ticket.lastActivityAt
    ? await formatDate(new Date(ticket.lastActivityAt))
    : null;
  const resolvedLabel = ticket.resolvedAt
    ? await formatDate(new Date(ticket.resolvedAt))
    : null;

  return (
    <div className="space-y-6">
      {/* Top strip: back + ticket number + inline admin controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 -ml-2"
          >
            <Link href="/admin/tickets" aria-label="Back to tickets">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-xs font-mono tracking-wide text-muted-foreground">
            {ticket.ticketNumber}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
              role: user.role,
            }))}
          />
        </div>
      </div>

      {/* Title + meta line */}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          {ticket.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>Opened by</span>
          <NameWithRole
            name={customer?.name}
            role={(customer as { role?: string })?.role}
            className="text-sm text-foreground font-medium"
            badgeClassName="h-4 px-2 text-[10px]"
          />
          {createdLabel && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span>{createdLabel}</span>
            </>
          )}
          {lastActivityLabel && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span>Last activity {lastActivityLabel}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-4 lg:gap-10">
        {/* Main content — flush on page bg */}
        <div className="lg:col-span-3 space-y-8">
          {/* Description */}
          <section className="space-y-2 pb-6 border-b">
            <h2 className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Description
            </h2>
            <TicketDescription description={ticket.description} />
          </section>

          {/* Tabs — underline style */}
          <Tabs defaultValue="comments" className="space-y-6">
            <TabsList className="h-auto w-full justify-start bg-transparent border-b rounded-none p-0 gap-1">
              <TabsTrigger
                value="comments"
                className="flex-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none bg-transparent border-0 text-muted-foreground hover:text-foreground px-4 pb-3 -mb-px font-medium transition-colors"
              >
                Comments
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                  {comments?.length ?? 0}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="meetings"
                className="flex-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none bg-transparent border-0 text-muted-foreground hover:text-foreground px-4 pb-3 -mb-px font-medium transition-colors"
              >
                Meetings
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                  {meetings?.length ?? 0}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="flex-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none rounded-none bg-transparent border-0 text-muted-foreground hover:text-foreground px-4 pb-3 -mb-px font-medium transition-colors"
              >
                Logs
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] text-muted-foreground">
                  {history?.length ?? 0}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="mt-0">
              <CommentSection
                ticketId={id}
                comments={comments}
                users={users}
                currentUserRole={
                  (session.user as SessionUser).role || "customer"
                }
                currentUserId={session.user.id}
                attachments={attachments}
                fileUploadsEnabled={fileUploadsEnabled}
              />
            </TabsContent>

            <TabsContent value="meetings" className="mt-0">
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

            <TabsContent value="history" className="mt-0">
              <RequestHistory history={history} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar — quiet metadata */}
        <aside className="lg:sticky lg:top-6 self-start text-sm divide-y divide-border/60 [&>div]:py-4 [&>div:first-child]:pt-0 [&>div:last-child]:pb-0">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Customer
            </div>
            <NameWithRole
              name={customer?.name}
              role={(customer as { role?: string })?.role}
              className="text-sm font-medium"
              badgeClassName="h-4 px-2 text-[10px]"
            />
            {customer?.email && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {customer.email}
              </p>
            )}
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
              Assigned To
            </div>
            {assignedTo ? (
              <>
                <NameWithRole
                  name={assignedTo.name}
                  role={(assignedTo as { role?: string }).role}
                  className="text-sm font-medium"
                  badgeClassName="h-4 px-2 text-[10px]"
                />
                <p className="text-xs text-muted-foreground mt-0.5">
                  {assignedTo.email}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Unassigned</p>
            )}
          </div>

          {departmentName && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Department
              </div>
              <p className="text-sm">{departmentName}</p>
            </div>
          )}

          {productLabel && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Product
              </div>
              <p className="text-sm">{productLabel}</p>
            </div>
          )}

          {createdLabel && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Created
              </div>
              <p className="text-sm">{createdLabel}</p>
            </div>
          )}

          {resolvedLabel && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Resolved
              </div>
              <p className="text-sm">{resolvedLabel}</p>
            </div>
          )}

          {ticket.tags && ticket.tags.length > 0 && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ticket.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-muted text-foreground text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {ticket.purchaseCode && (
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
                Purchase Code
              </div>
              <p className="text-xs font-mono break-all text-muted-foreground">
                {ticket.purchaseCode}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
