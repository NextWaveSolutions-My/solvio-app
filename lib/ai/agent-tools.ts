import type OpenAI from "openai";
import { searchKnowledge } from "@/lib/ai/knowledge-index";
import { findSimilarPairs } from "@/lib/ai/search";
import type { AIChatSource, AISettings } from "@/types";

export interface AgentToolContext {
  ip: string;
  userAgent?: string;
  userId?: string | null;
  visitorId: string;
  sessionId: string;
  chatLogId?: string;
  /**
   * Owning site resolved from the embed key. Scopes knowledge retrieval to this
   * site + global sources. Absent ⇒ global widget / all knowledge.
   */
  siteId?: string;
  settings: AISettings;
  /** Active ticket department slugs (for request_human_handoff). */
  departmentSlugs: string[];
  /**
   * Mutable. Set when the customer has agreed to talk to a human; the widget
   * then opens the ticket form. The agent never creates the ticket itself.
   */
  handoff: { requested: boolean; departmentSlug?: string };
  /**
   * Mutable. Accumulates the URL-bearing knowledge results retrieved this turn
   * (in retrieval-rank order) so the answer can be shown with clickable
   * citations. Deduped + capped by the caller.
   */
  sources: AIChatSource[];
}

export interface ToolDef {
  schema: OpenAI.Chat.Completions.ChatCompletionTool;
  /** All agent tools are read-only; the ticket is created by the widget form. */
  write: boolean;
  handler: (
    args: Record<string, any>,
    ctx: AgentToolContext
  ) => Promise<string>;
}

function fmtResults(
  rows: { title: string; content: string; score?: number }[]
): string {
  if (rows.length === 0) return "No matching results.";
  return rows
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}${
          typeof r.score === "number" ? ` (score ${r.score.toFixed(2)})` : ""
        }\n${r.content}`
    )
    .join("\n\n---\n\n");
}

export const AGENT_TOOLS: Record<string, ToolDef> = {
  search_knowledge: {
    write: false,
    schema: {
      type: "function",
      function: {
        name: "search_knowledge",
        description:
          "Search the knowledge base — documentation, products, services, " +
          "guides, uploaded files and indexed websites — for information to " +
          "answer the customer. It may span multiple products or topics, so " +
          "use this first for any product, pricing, feature, policy or how-to " +
          "question, even one naming something you don't recognize.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Search query" },
            topK: { type: "number", description: "Max results (default 5)" },
          },
          required: ["query"],
        },
      },
    },
    handler: async (args, ctx) => {
      const rows = await searchKnowledge(
        String(args.query ?? ""),
        Math.min(Number(args.topK) || 5, 8),
        { siteId: ctx.siteId }
      );
      // Record clickable citations (web pages carry a URL) in retrieval order
      // so the widget can show "Sources" under the answer.
      for (const r of rows) {
        if (r.url) ctx.sources.push({ title: r.title || r.url, url: r.url });
      }
      return fmtResults(rows);
    },
  },

  lookup_faq: {
    write: false,
    schema: {
      type: "function",
      function: {
        name: "lookup_faq",
        description:
          "Look up curated Q&A training pairs for an exact, vetted answer. " +
          "Prefer this answer verbatim when the score is high.",
        parameters: {
          type: "object",
          properties: {
            question: { type: "string", description: "The user's question" },
          },
          required: ["question"],
        },
      },
    },
    handler: async (args, ctx) => {
      const matches = await findSimilarPairs(String(args.question ?? ""), 3, {
        siteId: ctx.siteId,
      });
      const threshold = ctx.settings.confidenceThreshold;
      if (matches.length === 0) return "No FAQ entries found.";
      const best = matches[0];
      const confident = best.score >= threshold;
      return (
        `Best match (score ${best.score.toFixed(2)}, threshold ` +
        `${threshold.toFixed(2)}, ${confident ? "CONFIDENT" : "LOW"}):\n` +
        `Q: ${best.question}\nA: ${best.answer}`
      );
    },
  },

  search_resolved_tickets: {
    write: false,
    schema: {
      type: "function",
      function: {
        name: "search_resolved_tickets",
        description:
          "Search previously resolved support tickets for how similar past " +
          "issues were solved. Use for troubleshooting / 'how do I fix' cases.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Describe the issue" },
            topK: { type: "number", description: "Max results (default 5)" },
          },
          required: ["query"],
        },
      },
    },
    handler: async (args, ctx) => {
      const rows = await searchKnowledge(
        String(args.query ?? ""),
        Math.min(Number(args.topK) || 5, 8),
        { sourceTypes: ["resolved_ticket"], siteId: ctx.siteId }
      );
      return fmtResults(rows);
    },
  },

  request_human_handoff: {
    write: false,
    schema: {
      type: "function",
      function: {
        name: "request_human_handoff",
        description:
          "Call this ONLY after the customer has explicitly agreed to talk " +
          "to a human (e.g. answered 'yes'). It does not create a ticket — it " +
          "tells the app to open the support ticket form in the chat widget. " +
          "Pick the most relevant departmentSlug from the provided list so " +
          "the resulting ticket is routed correctly.",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Short reason the issue needs a human",
            },
            departmentSlug: {
              type: "string",
              description: "Best-fit department slug from the provided list",
            },
          },
          required: ["reason"],
        },
      },
    },
    handler: async (args, ctx) => {
      ctx.handoff.requested = true;
      ctx.handoff.departmentSlug =
        args.departmentSlug &&
        ctx.departmentSlugs.includes(String(args.departmentSlug))
          ? String(args.departmentSlug)
          : undefined;
      return (
        "Handoff acknowledged — the contact form is now open in the chat. " +
        "Reply with ONE short, friendly sentence: tell the customer to fill " +
        "in the form and that a human will get back to them by email. Do not " +
        "repeat their issue, ask if they need anything else, or add extra " +
        "commentary."
      );
    },
  },
};

export function toolSchemas(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return Object.values(AGENT_TOOLS).map((t) => t.schema);
}
