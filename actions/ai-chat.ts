"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth-utils";
import {
  getOrCreateAISettings,
  getChatbotConfig,
} from "@/lib/ai/settings-store";
import { createChatLog } from "@/lib/ai/chat-log";
import { runAgent } from "@/lib/ai/agent";
import { resolveChatScopeByKey, SITES_COLLECTION } from "@/lib/ai/sites";
import { createAgentTicket } from "@/lib/ai/create-agent-ticket";
import { checkRateLimit } from "@/lib/rate-limit";
import type {
  AIDomainAccuracyStats,
  AISite,
  AIChatAnalyticsStats,
  AIChatLog,
  AIChatOutcome,
  AIChatSource,
  AIChatUnansweredGroup,
  AIChatbotPublicConfig,
  ApiResponse,
  UserRole,
} from "@/types";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const role = ((session.user as any)?.role ?? "customer") as UserRole;
  if (role !== "admin") throw new Error("Forbidden: Admin access required");
  return session;
}

// ─── Public chatbot actions (callable from API routes) ──────────────────────

export async function getChatbotPublicConfig(): Promise<AIChatbotPublicConfig> {
  const settings = await getOrCreateAISettings();
  const config = getChatbotConfig(settings);
  return {
    enabled: settings.features.chatbot === true && settings.agent.enabled,
    welcomeMessage: config.welcomeMessage,
    fallbackMessage: config.fallbackMessage,
    placeholder: config.placeholder,
    position: config.position,
    primaryColor: config.primaryColor,
    accentColor: config.accentColor,
    headerTitle: config.headerTitle,
    footerText: config.footerText,
    headerAvatarUrl: config.headerAvatarUrl,
    widgetWidth: config.widgetWidth,
    widgetHeight: config.widgetHeight,
    businessName: settings.businessName,
    showPoweredBy: config.showPoweredBy,
  };
}

const handleChatSchema = z.object({
  question: z.string().min(1).max(500),
  visitorId: z.string().min(1).max(100),
  sessionId: z.string().min(1).max(100),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })
    )
    .max(12)
    .optional(),
  /** Embed snippet key → scopes retrieval to one site (+ global). */
  siteKey: z.string().max(100).optional(),
  /** Host origin the widget is embedded on, for optional domain validation. */
  host: z.string().max(200).optional(),
});

export interface HandleChatResult {
  matched: boolean;
  answer: string;
  outcome: AIChatOutcome;
  /** Customer agreed to a human → widget should open the ticket form. */
  escalated: boolean;
  /** Department the agent inferred, to pre-route the form submission. */
  suggestedDepartmentSlug?: string;
  /** Clickable web-page citations shown beneath the answer. */
  sources: AIChatSource[];
  logId: string;
}

export async function handleChatbotQuery(
  input: z.infer<typeof handleChatSchema>,
  context: { ip: string; userAgent?: string }
): Promise<ApiResponse<HandleChatResult>> {
  try {
    const parsed = handleChatSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid request" };
    }

    const settings = await getOrCreateAISettings();
    if (!settings.features.chatbot || !settings.agent.enabled) {
      return { success: false, error: "Chatbot is disabled" };
    }

    const config = getChatbotConfig(settings);
    const rate = await checkRateLimit({
      key: `aichat:${context.ip}`,
      limit: config.rateLimitPerMinute,
      windowSeconds: 60,
    });
    if (!rate.allowed) {
      return {
        success: false,
        error: `Too many requests. Try again in ${rate.retryAfter}s.`,
      };
    }

    const session = await getSession();
    const userId = session?.user?.id ?? null;
    const { question, visitorId, sessionId, history, siteKey, host } =
      parsed.data;
    const scope = await resolveChatScopeByKey(siteKey, host);
    if (scope.status === "denied") {
      return { success: false, error: scope.reason };
    }
    const siteId = scope.status === "site" ? scope.siteId : undefined;

    // Pre-create the log so the create_support_ticket tool can attach to it.
    const logObjectId = await createChatLog({
      visitorId,
      sessionId,
      userId,
      siteId,
      siteKey,
      host,
      question,
      outcome: "no_answer",
      userAgent: context.userAgent,
    });
    const logId = logObjectId.toString();

    const result = await runAgent({
      question,
      history: history ?? [],
      ctx: {
        ip: context.ip,
        userAgent: context.userAgent,
        userId,
        visitorId,
        sessionId,
        chatLogId: logId,
        siteId,
      },
    });

    // Backfill the log with the real outcome of this turn.
    const logCol = await getCollection<AIChatLog>("ai_chat_logs");
    await logCol.updateOne(
      { _id: logObjectId },
      {
        $set: {
          outcome: result.outcome,
          matched: result.outcome.startsWith("answered_"),
          answer: result.answer,
          toolCalls: result.toolCalls,
          sources: result.sources,
          iterations: result.iterations,
          fallbackUsed: result.handoffRequested,
        },
      }
    );

    return {
      success: true,
      data: {
        matched: result.outcome.startsWith("answered_"),
        answer: result.answer,
        outcome: result.outcome,
        escalated: result.handoffRequested,
        suggestedDepartmentSlug: result.suggestedDepartmentSlug,
        sources: result.sources,
        logId,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message ?? "Chat failed" };
  }
}

// ─── Guest ticket creation ──────────────────────────────────────────────────

const guestTicketSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  /** Becomes the ticket title (kept distinct from the message body). */
  subject: z.string().min(3).max(150),
  message: z.string().min(5).max(5000),
  visitorId: z.string().max(100).optional(),
  chatLogId: z.string().max(100).optional(),
  /** Department the agent inferred from the conversation (best-effort). */
  departmentSlug: z.string().max(80).optional(),
});

export interface GuestTicketResult {
  ticketId: string;
  ticketNumber: string;
}

export async function createGuestTicket(
  input: z.infer<typeof guestTicketSchema>,
  context: { ip: string }
): Promise<ApiResponse<GuestTicketResult>> {
  try {
    const parsed = guestTicketSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }

    const settings = await getOrCreateAISettings();
    if (!settings.features.chatbot) {
      return { success: false, error: "Chatbot is disabled" };
    }
    const config = getChatbotConfig(settings);

    const rate = await checkRateLimit({
      key: `guestticket:${context.ip}`,
      limit: config.ticketRateLimitPerHour,
      windowSeconds: 3600,
    });
    if (!rate.allowed) {
      return {
        success: false,
        error: `Too many ticket submissions. Try again in ${Math.ceil(rate.retryAfter / 60)} minutes.`,
      };
    }

    const { name, email, subject, message, chatLogId, departmentSlug } =
      parsed.data;
    const session = await getSession();
    const res = await createAgentTicket({
      name,
      email,
      summary: subject,
      details: message,
      departmentSlug,
      customerId: session?.user?.id ?? undefined,
      chatLogId,
      tags: ["ai-chatbot", "guest"],
    });
    if (!res.success || !res.data) {
      return { success: false, error: res.error ?? "Failed to submit" };
    }

    return {
      success: true,
      data: {
        ticketId: res.data.ticketId,
        ticketNumber: res.data.ticketNumber,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message ?? "Failed to submit" };
  }
}

// ─── Public answer feedback ─────────────────────────────────────────────────

const feedbackSchema = z.object({
  logId: z.string().min(1).max(100),
  visitorId: z.string().min(1).max(100),
  sessionId: z.string().min(1).max(100),
  feedback: z.enum(["up", "down"]),
});

export async function submitChatFeedback(
  input: unknown
): Promise<ApiResponse<{ feedback: "up" | "down" }>> {
  try {
    const parsed = feedbackSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "Invalid feedback" };
    }
    const { logId, visitorId, sessionId, feedback } = parsed.data;
    if (!ObjectId.isValid(logId)) {
      return { success: false, error: "Invalid feedback target" };
    }

    const col = await getCollection<AIChatLog>("ai_chat_logs");
    const res = await col.updateOne(
      {
        _id: new ObjectId(logId),
        visitorId,
        sessionId,
      },
      { $set: { feedback } }
    );

    if (res.matchedCount === 0) {
      return { success: false, error: "Conversation not found" };
    }
    return { success: true, data: { feedback } };
  } catch (error: any) {
    return { success: false, error: error.message ?? "Feedback failed" };
  }
}

// ─── Admin analytics ────────────────────────────────────────────────────────

export async function getChatbotAnalytics(): Promise<
  ApiResponse<AIChatAnalyticsStats>
> {
  try {
    await requireAdmin();
    const col = await getCollection<AIChatLog>("ai_chat_logs");

    const now = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;
    const ms7d = 7 * ms24h;
    const ms30d = 30 * ms24h;

    const [
      total,
      matched,
      escalated,
      positiveFeedback,
      negativeFeedback,
      last24h,
      last7d,
      last30d,
    ] =
      await Promise.all([
        col.countDocuments({}),
        col.countDocuments({ matched: true }),
        col.countDocuments({ outcome: "escalated_ticket" }),
        col.countDocuments({ feedback: "up" }),
        col.countDocuments({ feedback: "down" }),
        col.countDocuments({ createdAt: { $gte: new Date(now - ms24h) } }),
        col.countDocuments({ createdAt: { $gte: new Date(now - ms7d) } }),
        col.countDocuments({ createdAt: { $gte: new Date(now - ms30d) } }),
      ]);
    const feedbackTotal = positiveFeedback + negativeFeedback;

    return {
      success: true,
      data: {
        total,
        matched,
        unmatched: total - matched,
        escalated,
        matchRate: total === 0 ? 0 : Math.round((matched / total) * 100),
        feedbackTotal,
        positiveFeedback,
        negativeFeedback,
        feedbackAccuracy:
          feedbackTotal === 0
            ? null
            : Math.round((positiveFeedback / feedbackTotal) * 100),
        last24h,
        last7d,
        last30d,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDomainAccuracyStats(
  limit = 20
): Promise<ApiResponse<AIDomainAccuracyStats[]>> {
  try {
    await requireAdmin();
    const col = await getCollection<AIChatLog>("ai_chat_logs");
    const cappedLimit = Math.min(50, Math.max(1, limit));

    const rows = await col
      .aggregate<{
        _id: { siteId: string; host: string };
        total: number;
        answered: number;
        noAnswer: number;
        escalated: number;
        positiveFeedback: number;
        negativeFeedback: number;
        lastSeen: Date;
      }>([
        {
          $group: {
            _id: {
              siteId: { $ifNull: ["$siteId", ""] },
              host: { $ifNull: ["$host", ""] },
            },
            total: { $sum: 1 },
            answered: { $sum: { $cond: ["$matched", 1, 0] } },
            noAnswer: {
              $sum: { $cond: [{ $eq: ["$outcome", "no_answer"] }, 1, 0] },
            },
            escalated: {
              $sum: {
                $cond: [{ $eq: ["$outcome", "escalated_ticket"] }, 1, 0],
              },
            },
            positiveFeedback: {
              $sum: { $cond: [{ $eq: ["$feedback", "up"] }, 1, 0] },
            },
            negativeFeedback: {
              $sum: { $cond: [{ $eq: ["$feedback", "down"] }, 1, 0] },
            },
            lastSeen: { $max: "$createdAt" },
          },
        },
        { $sort: { total: -1, lastSeen: -1 } },
        { $limit: cappedLimit },
      ])
      .toArray();

    const siteIds = rows
      .map((r) => r._id.siteId)
      .filter((id) => ObjectId.isValid(id));
    const siteNames = new Map<string, string>();
    if (siteIds.length > 0) {
      const sitesCol = await getCollection<AISite>(SITES_COLLECTION);
      const sites = await sitesCol
        .find({ _id: { $in: siteIds.map((id) => new ObjectId(id)) } })
        .project<Pick<AISite, "_id" | "name">>({ name: 1 })
        .toArray();
      for (const site of sites) siteNames.set(site._id.toString(), site.name);
    }

    return {
      success: true,
      data: rows.map((r) => {
        const siteId = r._id.siteId || undefined;
        const host = r._id.host || undefined;
        const feedbackTotal = r.positiveFeedback + r.negativeFeedback;
        return {
          key: `${siteId ?? "global"}::${host ?? "app"}`,
          siteId,
          siteName: siteId
            ? (siteNames.get(siteId) ?? "Unknown site")
            : host
              ? "Global widget"
              : "Admin/test chat",
          host,
          total: r.total,
          answered: r.answered,
          noAnswer: r.noAnswer,
          escalated: r.escalated,
          matchRate:
            r.total === 0 ? 0 : Math.round((r.answered / r.total) * 100),
          feedbackTotal,
          positiveFeedback: r.positiveFeedback,
          negativeFeedback: r.negativeFeedback,
          feedbackAccuracy:
            feedbackTotal === 0
              ? null
              : Math.round((r.positiveFeedback / feedbackTotal) * 100),
          lastSeen: r.lastSeen,
        };
      }),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getUnansweredQuestions(
  limit = 20
): Promise<ApiResponse<AIChatUnansweredGroup[]>> {
  try {
    await requireAdmin();
    const col = await getCollection<AIChatLog>("ai_chat_logs");

    const results = await col
      .aggregate<{
        _id: string;
        sample: string;
        count: number;
        lastSeen: Date;
      }>([
        { $match: { matched: false } },
        {
          $group: {
            _id: "$questionNormalized",
            sample: { $first: "$question" },
            count: { $sum: 1 },
            lastSeen: { $max: "$createdAt" },
          },
        },
        { $sort: { count: -1, lastSeen: -1 } },
        { $limit: limit },
      ])
      .toArray();

    return {
      success: true,
      data: results.map((r) => ({
        question: r.sample,
        count: r.count,
        lastSeen: r.lastSeen,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export interface RecentChatLog {
  _id: string;
  question: string;
  matched: boolean;
  outcome: AIChatOutcome;
  matchScore?: number;
  answer?: string;
  toolsUsed?: string[];
  iterations?: number;
  siteId?: string;
  host?: string;
  feedback?: "up" | "down" | null;
  visitorId: string;
  userId?: string;
  ticketId?: string;
  createdTicketId?: string;
  createdAt: Date;
}

export async function getRecentChatLogs(
  limit = 50
): Promise<ApiResponse<RecentChatLog[]>> {
  try {
    await requireAdmin();
    const col = await getCollection<AIChatLog>("ai_chat_logs");
    const rows = await col
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return {
      success: true,
      data: rows.map((r) => ({
        _id: r._id.toString(),
        question: r.question,
        matched: r.matched,
        outcome: r.outcome ?? (r.matched ? "answered_kb" : "no_answer"),
        matchScore: r.matchScore
          ? Math.round(r.matchScore * 100)
          : undefined,
        answer: r.answer,
        toolsUsed: r.toolCalls?.map((t) => t.name),
        iterations: r.iterations,
        siteId: r.siteId,
        host: r.host,
        feedback: r.feedback ?? null,
        visitorId: r.visitorId,
        userId: r.userId,
        ticketId: r.ticketId,
        createdTicketId: r.createdTicketId,
        createdAt: r.createdAt,
      })),
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function clearOldChatLogs(
  olderThanDays: number
): Promise<ApiResponse<{ deleted: number }>> {
  try {
    await requireAdmin();
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const col = await getCollection<AIChatLog>("ai_chat_logs");
    const result = await col.deleteMany({ createdAt: { $lt: cutoff } });
    return { success: true, data: { deleted: result.deletedCount } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
