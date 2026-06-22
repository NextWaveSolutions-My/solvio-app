import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import type { AIChatLog, AIChatOutcome, AIChatToolCall } from "@/types";

const ANSWERED_OUTCOMES: AIChatOutcome[] = [
  "answered_kb",
  "answered_faq",
  "answered_resolved_ticket",
  "answered_general",
];

const COLLECTION = "ai_chat_logs";

export function normalizeQuestion(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface CreateChatLogInput {
  visitorId: string;
  sessionId: string;
  userId?: string | null;
  siteId?: string;
  siteKey?: string;
  host?: string;
  question: string;
  outcome: AIChatOutcome;
  matchScore?: number;
  matchedPairId?: string;
  answer?: string;
  toolCalls?: AIChatToolCall[];
  iterations?: number;
  createdTicketId?: string;
  userAgent?: string;
}

export async function createChatLog(
  input: CreateChatLogInput
): Promise<ObjectId> {
  const col = await getCollection<AIChatLog>(COLLECTION);
  const _id = new ObjectId();
  const doc: AIChatLog = {
    _id,
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    userId: input.userId ?? undefined,
    siteId: input.siteId,
    siteKey: input.siteKey,
    host: input.host,
    question: input.question,
    questionNormalized: normalizeQuestion(input.question),
    outcome: input.outcome,
    matched: ANSWERED_OUTCOMES.includes(input.outcome),
    matchScore: input.matchScore,
    matchedPairId: input.matchedPairId,
    answer: input.answer,
    toolCalls: input.toolCalls,
    iterations: input.iterations,
    createdTicketId: input.createdTicketId,
    fallbackUsed: input.outcome === "escalated_ticket",
    ticketId: input.createdTicketId,
    userAgent: input.userAgent,
    createdAt: new Date(),
  };
  await col.insertOne(doc);
  return _id;
}

export async function attachTicketToLog(
  logId: string,
  ticketId: string
): Promise<void> {
  if (!ObjectId.isValid(logId)) return;
  const col = await getCollection<AIChatLog>(COLLECTION);
  await col.updateOne(
    { _id: new ObjectId(logId) },
    { $set: { ticketId, fallbackUsed: true } }
  );
}
