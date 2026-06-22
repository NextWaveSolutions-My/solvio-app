"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession } from "@/lib/auth-utils";
import type {
  AIEvalCase,
  AIEvalCasePublic,
  AIEvalRun,
  AIEvalRunPublic,
  ApiResponse,
  UserRole,
} from "@/types";
import { runEvaluationOnce } from "@/lib/ai/eval-runner";
import { normalizeSiteId } from "@/lib/ai/sites";

const CASES_COLLECTION = "ai_eval_cases";
const RUNS_COLLECTION = "ai_eval_runs";

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const role = ((session.user as any)?.role ?? "customer") as UserRole;
  if (role !== "admin") throw new Error("Forbidden: Admin access required");
  return session;
}

function revalidateAI() {
  revalidatePath("/admin/ai-support-agent");
}

const caseSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(1000),
  expectedAnswer: z.string().trim().min(1, "Expected answer is required").max(5000),
  category: z.string().trim().max(100).optional(),
  siteId: z.string().max(100).optional(),
});

function caseToPublic(doc: AIEvalCase): AIEvalCasePublic {
  return {
    _id: doc._id.toString(),
    question: doc.question,
    expectedAnswer: doc.expectedAnswer,
    category: doc.category,
    siteId: doc.siteId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function runToPublic(doc: AIEvalRun): AIEvalRunPublic {
  return {
    _id: doc._id.toString(),
    status: doc.status,
    totalCases: doc.totalCases,
    passed: doc.passed,
    partial: doc.partial,
    failed: doc.failed,
    avgScore: doc.avgScore,
    passThreshold: doc.passThreshold,
    results: doc.results,
    error: doc.error ?? null,
    startedAt: doc.startedAt.toISOString(),
    finishedAt: doc.finishedAt ? doc.finishedAt.toISOString() : null,
  };
}

export async function listEvalCases(): Promise<
  ApiResponse<AIEvalCasePublic[]>
> {
  try {
    await requireAdmin();
    const col = await getCollection<AIEvalCase>(CASES_COLLECTION);
    const docs = await col.find({}).sort({ createdAt: -1 }).toArray();
    return { success: true, data: docs.map(caseToPublic) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createEvalCase(
  input: z.infer<typeof caseSchema>
): Promise<ApiResponse<AIEvalCasePublic>> {
  try {
    const session = await requireAdmin();
    const parsed = caseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message };
    }
    const col = await getCollection<AIEvalCase>(CASES_COLLECTION);
    const now = new Date();
    const siteId = await normalizeSiteId(parsed.data.siteId);
    const doc: AIEvalCase = {
      _id: new ObjectId(),
      question: parsed.data.question,
      expectedAnswer: parsed.data.expectedAnswer,
      category: parsed.data.category || undefined,
      ...(siteId ? { siteId } : {}),
      createdAt: now,
      updatedAt: now,
      createdBy: (session.user as any).id,
    };
    await col.insertOne(doc);
    revalidateAI();
    return { success: true, data: caseToPublic(doc) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteEvalCase(id: string): Promise<ApiResponse<void>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id)) {
      return { success: false, error: "Invalid case ID" };
    }
    const col = await getCollection<AIEvalCase>(CASES_COLLECTION);
    await col.deleteOne({ _id: new ObjectId(id) });
    revalidateAI();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLatestEvalRun(): Promise<
  ApiResponse<AIEvalRunPublic | null>
> {
  try {
    await requireAdmin();
    const col = await getCollection<AIEvalRun>(RUNS_COLLECTION);
    const doc = await col.find({}).sort({ startedAt: -1 }).limit(1).next();
    return { success: true, data: doc ? runToPublic(doc) : null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runEvaluation(): Promise<
  ApiResponse<AIEvalRunPublic>
> {
  try {
    const session = await requireAdmin();
    const run = await runEvaluationOnce((session.user as any).id);
    revalidateAI();
    return { success: true, data: runToPublic(run) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
