"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCollection } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createPublicTicketSchema, guestCommentSchema } from "@/lib/validations";
import { createAgentTicket } from "@/lib/ai/create-agent-ticket";
import {
  ensureDefaultTicketCategories,
  validateTicketCategoryForTicketCreation,
} from "@/lib/ticket-categories";
import {
  ensureDefaultTicketDepartments,
  validateTicketDepartmentForTicketCreation,
} from "@/lib/ticket-departments";
import { verifyPurchaseCode, isPurchaseCodeRequired } from "@/lib/envato";
import { getOrCreateAISettings, getChatbotConfig } from "@/lib/ai/settings-store";
import { getRequestPaths } from "@/lib/request-utils";
import { createNotification, createBulkNotifications } from "@/lib/notifications";
import { getUserIdsByRole } from "@/lib/user-utils";
import type {
  ApiResponse,
  Comment,
  Ticket,
  TicketCategoryDefinition,
  TicketDepartmentDefinition,
  TicketProductDefinition,
  PurchaseVerification,
} from "@/types";

/** Public-safe view of a guest ticket + its non-internal conversation. */
export interface GuestTicketView {
  ticketNumber: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  guestName?: string;
  comments: GuestTicketComment[];
}

export interface GuestTicketComment {
  id: string;
  content: string;
  createdAt: string;
  fromGuest: boolean;
  authorName: string;
}

/**
 * Public (un-authenticated) ticket creation surface used by the /support/new
 * page. These are deliberately isolated in one file — none of them require a
 * session — so the public attack surface stays easy to audit. The write path
 * reuses `createAgentTicket`, the same guest-ticket core the AI chatbot uses.
 */

// ─── Catalog getters (no auth) ──────────────────────────────────────────────

export async function getPublicTicketCategories(): Promise<
  ApiResponse<Array<{ slug: string; name: string }>>
> {
  try {
    await ensureDefaultTicketCategories();
    const collection = await getCollection<TicketCategoryDefinition>(
      "ticket_categories"
    );
    const categories = await collection
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();
    return {
      success: true,
      data: categories.map((c) => ({ slug: c.slug, name: c.name })),
    };
  } catch (error) {
    console.error("Get public ticket categories error:", error);
    return { success: false, error: "Failed to load categories" };
  }
}

export async function getPublicTicketDepartments(): Promise<
  ApiResponse<Array<{ slug: string; name: string }>>
> {
  try {
    await ensureDefaultTicketDepartments();
    const collection = await getCollection<TicketDepartmentDefinition>(
      "ticket_departments"
    );
    const departments = await collection
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();
    return {
      success: true,
      data: departments.map((d) => ({ slug: d.slug, name: d.name })),
    };
  } catch (error) {
    console.error("Get public ticket departments error:", error);
    return { success: false, error: "Failed to load departments" };
  }
}

export async function getPublicTicketProducts(): Promise<
  ApiResponse<Array<{ slug: string; name: string }>>
> {
  try {
    const collection = await getCollection<TicketProductDefinition>(
      "ticket_products"
    );
    const products = await collection
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .toArray();
    return {
      success: true,
      data: products.map((p) => ({ slug: p.slug, name: p.name })),
    };
  } catch (error) {
    console.error("Get public ticket products error:", error);
    return { success: false, error: "Failed to load products" };
  }
}

// ─── Purchase code verification (no auth) ───────────────────────────────────

export async function verifyPublicPurchaseCode(
  purchaseCode: string
): Promise<ApiResponse<PurchaseVerification>> {
  try {
    const trimmedCode = purchaseCode?.trim();
    if (!trimmedCode) {
      return { success: false, error: "Purchase code is required" };
    }
    const result = await verifyPurchaseCode(trimmedCode);
    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to verify purchase code",
      };
    }
    return {
      success: true,
      data: result.data,
      message: "Purchase code verified successfully",
    };
  } catch (error) {
    console.error("Public purchase code verification error:", error);
    return { success: false, error: "Failed to verify purchase code" };
  }
}

// ─── Ticket creation (no auth) ──────────────────────────────────────────────

/** Read the client IP from forwarding headers (mirrors extractClientIp). */
async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = h.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export async function createPublicTicket(
  input: z.infer<typeof createPublicTicketSchema>
): Promise<ApiResponse<{ ticketNumber: string }>> {
  try {
    const parsed = createPublicTicketSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid submission",
      };
    }
    const data = parsed.data;

    // Rate limit by IP, reusing the chatbot's per-hour ticket limit.
    const ip = await getClientIp();
    let limit = 3;
    try {
      const settings = await getOrCreateAISettings();
      limit = getChatbotConfig(settings).ticketRateLimitPerHour ?? 3;
    } catch {
      // fall back to the default limit
    }
    const rate = await checkRateLimit({
      key: `publicticket:${ip}`,
      limit,
      windowSeconds: 3600,
    });
    if (!rate.allowed) {
      return {
        success: false,
        error: `Too many ticket submissions. Try again in ${Math.ceil(
          rate.retryAfter / 60
        )} minutes.`,
      };
    }

    // Validate category + department against the admin-managed catalogs.
    const categoryCheck = await validateTicketCategoryForTicketCreation(
      data.category
    );
    if (!categoryCheck.ok) {
      return { success: false, error: categoryCheck.error };
    }
    const departmentSlug = data.departmentSlug || undefined;
    const departmentCheck = await validateTicketDepartmentForTicketCreation(
      departmentSlug
    );
    if (!departmentCheck.ok) {
      return { success: false, error: departmentCheck.error };
    }

    // Enforce Envato purchase-code policy (mirrors actions/tickets.ts).
    let purchaseVerification: PurchaseVerification | undefined;
    const purchaseCodeRequired = await isPurchaseCodeRequired();
    if (purchaseCodeRequired) {
      if (!data.purchaseCode) {
        return {
          success: false,
          error: "Purchase code is required to create a support ticket",
        };
      }
      const verification = await verifyPurchaseCode(data.purchaseCode);
      if (!verification.success) {
        return {
          success: false,
          error: verification.error || "Invalid purchase code",
        };
      }
      purchaseVerification = verification.data;
    } else if (data.purchaseCode) {
      // Optional code supplied — verify best-effort and store if valid.
      const verification = await verifyPurchaseCode(data.purchaseCode);
      if (verification.success && verification.data) {
        purchaseVerification = verification.data;
      }
    }

    const res = await createAgentTicket({
      name: data.name,
      email: data.email,
      summary: data.title,
      details: data.description,
      priority: data.priority,
      category: data.category,
      departmentSlug,
      productSlug: data.productSlug || undefined,
      timezone: data.timezone,
      purchaseCode: data.purchaseCode || undefined,
      purchaseVerification,
      customerId: undefined, // guest
      tags: ["public-form"],
    });

    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? "Failed to create ticket" };
    }

    return {
      success: true,
      data: { ticketNumber: res.data.ticketNumber },
    };
  } catch (error) {
    console.error("Create public ticket error:", error);
    return { success: false, error: "Failed to create ticket" };
  }
}

// ─── Guest ticket portal (token-authed, no login) ──────────────────────────

const NOT_FOUND = "This ticket link is invalid or has expired.";

/** Resolve a guest ticket by its bearer token. Guest tickets always live in
 * the `tickets` collection (see createAgentTicket). */
async function findTicketByToken(token: string): Promise<Ticket | null> {
  const clean = token?.trim();
  if (!clean) return null;
  const tickets = await getCollection<Ticket>("tickets");
  return tickets.findOne({ guestAccessToken: clean, isGuest: true });
}

/** Map staff/guest userIds to display names (never exposes emails). */
async function resolveAuthorNames(
  userIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const staffIds = [...new Set(userIds.filter((id) => id && id !== "guest"))];
  if (staffIds.length === 0) return map;
  const users = await getCollection<{ id: string; name?: string }>("user");
  const docs = await users.find({ id: { $in: staffIds } }).toArray();
  for (const u of docs) map.set(u.id, u.name || "Support");
  return map;
}

export async function getGuestTicketByToken(
  token: string
): Promise<ApiResponse<GuestTicketView>> {
  try {
    const ticket = await findTicketByToken(token);
    if (!ticket) return { success: false, error: NOT_FOUND };

    const ticketId = ticket._id.toString();
    const commentsCollection = await getCollection<Comment>("comments");
    const rawComments = await commentsCollection
      .find({ ticketId, isInternal: false })
      .sort({ createdAt: 1 })
      .toArray();

    const nameMap = await resolveAuthorNames(rawComments.map((c) => c.userId));
    const comments: GuestTicketComment[] = rawComments.map((c) => {
      const fromGuest = c.userId === "guest";
      return {
        id: c._id.toString(),
        content: c.content,
        createdAt:
          c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : String(c.createdAt),
        fromGuest,
        authorName: fromGuest
          ? ticket.guestName || "You"
          : nameMap.get(c.userId) || "Support",
      };
    });

    return {
      success: true,
      data: {
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        createdAt:
          ticket.createdAt instanceof Date
            ? ticket.createdAt.toISOString()
            : String(ticket.createdAt),
        guestName: ticket.guestName,
        comments,
      },
    };
  } catch (error) {
    console.error("Get guest ticket error:", error);
    return { success: false, error: NOT_FOUND };
  }
}

export async function addGuestTicketComment(
  token: string,
  input: z.infer<typeof guestCommentSchema>
): Promise<ApiResponse<GuestTicketComment>> {
  try {
    const parsed = guestCommentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || "Invalid message",
      };
    }

    const ip = await getClientIp();
    const rate = await checkRateLimit({
      key: `guestcomment:${ip}`,
      limit: 20,
      windowSeconds: 3600,
    });
    if (!rate.allowed) {
      return {
        success: false,
        error: `Too many replies. Try again in ${Math.ceil(
          rate.retryAfter / 60
        )} minutes.`,
      };
    }

    const ticket = await findTicketByToken(token);
    if (!ticket) return { success: false, error: NOT_FOUND };

    const ticketId = ticket._id.toString();
    const now = new Date();
    const comment: Omit<Comment, "_id"> = {
      ticketId,
      userId: "guest",
      content: parsed.data.content,
      isInternal: false,
      createdAt: now,
      updatedAt: now,
    };
    const commentsCollection = await getCollection<Comment>("comments");
    const result = await commentsCollection.insertOne(comment as Comment);

    const tickets = await getCollection<Ticket>("tickets");
    await tickets.updateOne(
      { _id: ticket._id },
      { $set: { lastActivityAt: now, updatedAt: now } }
    );

    const historyCollection = await getCollection("ticket_history");
    await historyCollection.insertOne({
      ticketId: ticket._id,
      requestType: "ticket",
      userId: "guest",
      action: "comment_added",
      metadata: { commentId: result.insertedId.toString() },
      createdAt: now,
    });

    // Let staff know the customer replied.
    try {
      const paths = getRequestPaths(ticketId, "ticket");
      const notif = {
        type: "comment" as const,
        title: "New Reply from Customer",
        body: `${ticket.guestName || "Customer"} replied to ticket #${
          ticket.ticketNumber
        }`,
        data: {
          ticketId,
          ticketNumber: ticket.ticketNumber,
          commentId: result.insertedId.toString(),
          url: paths.supportDetail,
        },
      };
      // Always notify admins so the reply shows in the admin panel, plus the
      // assigned support agent (if any) using the support-panel URL.
      const adminIds = await getUserIdsByRole(["admin"]);
      if (adminIds.length > 0) {
        await createBulkNotifications(adminIds, {
          ...notif,
          data: { ...notif.data, url: paths.adminDetail },
        });
      }
      if (ticket.assignedToId && !adminIds.includes(ticket.assignedToId)) {
        await createNotification({ userId: ticket.assignedToId, ...notif });
      }
      revalidatePath(paths.supportDetail);
      revalidatePath(paths.adminDetail);
      revalidatePath(paths.dashboardDetail);
    } catch (e) {
      console.error("[guest-comment] notify failed", e);
    }

    return {
      success: true,
      data: {
        id: result.insertedId.toString(),
        content: parsed.data.content,
        createdAt: now.toISOString(),
        fromGuest: true,
        authorName: ticket.guestName || "You",
      },
    };
  } catch (error) {
    console.error("Add guest comment error:", error);
    return { success: false, error: "Failed to send your reply" };
  }
}
