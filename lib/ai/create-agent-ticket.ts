import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import { getSystemSettings } from "@/lib/settings-utils";
import {
  generateTicketNumberAtomic,
  getRequestPaths,
} from "@/lib/request-utils";
import { validateTicketDepartmentForTicketCreation } from "@/lib/ticket-departments";
import { createBulkNotifications, createNotification } from "@/lib/notifications";
import { getUserIdsByRole } from "@/lib/user-utils";
import { assignByDepartment } from "@/lib/ai/assign-by-department";
import { attachTicketToLog } from "@/lib/ai/chat-log";
import type {
  ApiResponse,
  Ticket,
  TicketPriority,
  TicketCategory,
  PurchaseVerification,
} from "@/types";

export interface CreateAgentTicketInput {
  name: string;
  email: string;
  /** Short title-ish summary of the issue. */
  summary: string;
  /** Full problem description. */
  details: string;
  /** Department slug the agent classified the issue into. */
  departmentSlug?: string;
  /** Customer id when the chatter is logged in; defaults to "guest". */
  customerId?: string;
  chatLogId?: string;
  tags?: string[];
  /** Ticket priority. Defaults to "medium". */
  priority?: TicketPriority;
  /** Ticket category slug. Defaults to "general". */
  category?: TicketCategory | string;
  /** Product slug from the admin-managed catalog. */
  productSlug?: string;
  /** Customer's timezone. */
  timezone?: string;
  /** Envato purchase code, when supplied. */
  purchaseCode?: string;
  /** Verified Envato purchase data, when available. */
  purchaseVerification?: PurchaseVerification;
}

export interface AgentTicketResult {
  ticketId: string;
  ticketNumber: string;
  assignedToId: string | null;
}

/**
 * Shared core for AI-created escalation tickets. Used both by the agent's
 * `create_support_ticket` tool and the manual guest ticket form. This is the
 * ONLY write path the chatbot has — it never resolves/closes/reassigns.
 */
export async function createAgentTicket(
  input: CreateAgentTicketInput
): Promise<ApiResponse<AgentTicketResult>> {
  const summary = input.summary?.trim();
  const details = input.details?.trim();
  if (!summary || !details) {
    return { success: false, error: "Summary and details are required" };
  }

  let departmentSlug = input.departmentSlug?.trim() || undefined;
  if (departmentSlug) {
    const valid = await validateTicketDepartmentForTicketCreation(
      departmentSlug
    );
    if (!valid.ok) departmentSlug = undefined;
  }

  const sysSettings = await getSystemSettings();
  const prefix =
    sysSettings.tickets?.ticketNumberPrefix ||
    process.env.TICKET_NUMBER_PREFIX ||
    "TICKET";
  const ticketNumber = await generateTicketNumberAtomic(prefix);

  const assignedToId = await assignByDepartment(departmentSlug);

  const now = new Date();
  const _id = new ObjectId();
  const title = summary.length > 80 ? `${summary.slice(0, 80)}...` : summary;
  const isGuest = !input.customerId || input.customerId === "guest";
  // Bearer token for the public ticket portal — guests have no account to log
  // into, so this lets them view + reply via /support/ticket/<token>.
  const guestAccessToken = isGuest ? randomBytes(32).toString("hex") : undefined;

  const ticket: Ticket = {
    _id,
    ticketNumber,
    title,
    description: details,
    status: "open",
    priority: input.priority ?? "medium",
    category: (input.category as TicketCategory) ?? "general",
    departmentSlug,
    productSlug: input.productSlug || undefined,
    customerId: input.customerId || "guest",
    assignedToId: assignedToId ?? undefined,
    purchaseCode: input.purchaseCode || undefined,
    purchaseVerification: input.purchaseVerification,
    timezone: input.timezone || undefined,
    tags: input.tags ?? ["ai-chatbot", "ai-agent", "auto-assigned"],
    createdAt: now,
    updatedAt: now,
    lastActivityAt: now,
    isGuest,
    guestName: input.name,
    guestEmail: input.email,
    guestAccessToken,
  };

  const col = await getCollection<Ticket>("tickets");
  await col.insertOne(ticket);

  // History: created + (optionally) assigned
  try {
    const history = await getCollection("ticket_history");
    const entries: Record<string, unknown>[] = [
      {
        ticketId: _id,
        requestType: "ticket",
        userId: "ai-agent",
        action: "created",
        createdAt: now,
      },
    ];
    if (assignedToId) {
      entries.push({
        ticketId: _id,
        requestType: "ticket",
        userId: "ai-agent",
        action: "assigned",
        newValue: assignedToId,
        metadata: {
          assignedBy: "auto_department_routing",
          departmentSlug,
        },
        createdAt: now,
      });
    }
    await history.insertMany(entries);
  } catch (e) {
    console.error("[agent-ticket] history failed", e);
  }

  // Notify assignee + admins, and run the standard new-ticket integrations
  // with fully-formed deep links (mirrors actions/tickets.ts createTicket).
  try {
    const paths = getRequestPaths(_id.toString(), "ticket");
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (assignedToId) {
      await createNotification({
        userId: assignedToId,
        type: "ticket_assignment",
        title: "Ticket Assigned to You",
        body: `You have been assigned to ticket #${ticketNumber}: ${title}`,
        data: {
          ticketId: _id.toString(),
          ticketNumber,
          url: paths.supportDetail,
        },
      });
    }

    const adminIds = await getUserIdsByRole(["admin"]);
    if (adminIds.length > 0) {
      await createBulkNotifications(adminIds, {
        type: "new_ticket",
        title: assignedToId
          ? `New ticket ${ticketNumber} assigned`
          : `New AI ticket ${ticketNumber}`,
        body: title,
        data: {
          ticketId: _id.toString(),
          ticketNumber,
          url: paths.adminDetail,
        },
      });
    }

    const { sendAdminNewTicketEmails, sendTicketAssignmentEmail } =
      await import("@/lib/ticket-email-notifications");

    if (assignedToId) {
      await sendTicketAssignmentEmail({
        assigneeId: assignedToId,
        ticket,
        ticketUrl: `${baseUrl}${paths.supportDetail}`,
      });
    }

    await sendAdminNewTicketEmails({
      ticket,
      customerName: input.name || "Unknown",
      customerEmail: input.email || "Unknown",
      ticketUrl: `${baseUrl}${paths.adminDetail}`,
    });

    const { sendNewTicketIntegrationNotifications } = await import(
      "@/lib/ticket-integrations"
    );
    await sendNewTicketIntegrationNotifications({
      ticket,
      kind: "ticket",
      actorName: input.name || "Customer",
      actorRole: "customer",
      customerName: input.name || "Unknown",
      customerEmail: input.email,
      adminUrl: `${baseUrl}${paths.adminDetail}`,
      dashboardUrl: `${baseUrl}${paths.dashboardDetail}`,
    });
  } catch (e) {
    console.error("[agent-ticket] notifications failed", e);
  }

  // Confirmation email to the customer (mirrors actions/tickets.ts createTicket).
  try {
    const email = input.email?.trim();
    const looksLikeEmail = !!email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
    if (looksLikeEmail) {
      const { emailTemplates, sendEmail, shouldSendEmailNotification } =
        await import("@/lib/email");
      const { enabled: sendNewTicketEmail } =
        await shouldSendEmailNotification("newTicket");

      if (sendNewTicketEmail) {
        const portalBaseUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const viewUrl = guestAccessToken
          ? `${portalBaseUrl}/support/ticket/${guestAccessToken}`
          : undefined;
        const result = await sendEmail({
          to: email!,
          ...emailTemplates.ticketCreated(ticketNumber, title, viewUrl),
        });
        if (!result.success) {
          console.error(
            `[agent-ticket] confirmation email to ${email} failed:`,
            result.error
          );
        }
      }
    }
  } catch (e) {
    console.error("[agent-ticket] confirmation email failed", e);
  }

  if (input.chatLogId) {
    await attachTicketToLog(input.chatLogId, _id.toString());
  }

  return {
    success: true,
    data: { ticketId: _id.toString(), ticketNumber, assignedToId },
  };
}
