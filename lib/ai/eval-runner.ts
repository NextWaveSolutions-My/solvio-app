import { ObjectId } from "mongodb";
import { getCollection } from "@/lib/db";
import type {
  AIChatOutcome,
  AIEvalCase,
  AIEvalCaseResult,
  AIEvalRun,
  AIEvalVerdict,
} from "@/types";
import { runAgent } from "@/lib/ai/agent";
import { judgeAnswer } from "@/lib/ai/eval-judge";

const CASES_COLLECTION = "ai_eval_cases";
const RUNS_COLLECTION = "ai_eval_runs";

/** Cap per run so an evaluation can't run unbounded (each case = agent + judge). */
const MAX_EVAL_CASES = 40;
/** Score at/above which a case counts as a pass. */
const PASS_THRESHOLD = 70;
/** Keep run history bounded. */
const KEEP_RUNS = 20;

function verdictFor(score: number): AIEvalVerdict {
  if (score >= PASS_THRESHOLD) return "pass";
  if (score >= 40) return "partial";
  return "fail";
}

/**
 * Run every eval case through the real agent, judge each answer against the
 * expected one, persist the run, and return it. Synchronous: evaluation is
 * admin-triggered and infrequent, and each case is one agent loop + one judge
 * call, so a capped set finishes in a reasonable, bounded time.
 */
export async function runEvaluationOnce(createdBy: string): Promise<AIEvalRun> {
  const casesCol = await getCollection<AIEvalCase>(CASES_COLLECTION);
  const cases = await casesCol
    .find({})
    .sort({ createdAt: 1 })
    .limit(MAX_EVAL_CASES)
    .toArray();

  if (cases.length === 0) {
    throw new Error("Add at least one evaluation case first.");
  }

  const startedAt = new Date();
  const results: AIEvalCaseResult[] = [];

  for (const c of cases) {
    const t = Date.now();
    let actualAnswer = "";
    let outcome: AIChatOutcome = "no_answer";
    let toolsUsed: string[] = [];
    let iterations = 0;

    try {
      const res = await runAgent({
        question: c.question,
        history: [],
        ctx: {
          ip: "evaluation",
          visitorId: "evaluation",
          sessionId: `eval-${c._id.toString()}`,
          userId: null,
          siteId: c.siteId,
        },
      });
      actualAnswer = res.answer;
      outcome = res.outcome;
      toolsUsed = res.toolCalls.map((tc) => tc.name);
      iterations = res.iterations;
    } catch (error) {
      actualAnswer = `[agent error] ${(error as Error).message}`;
    }

    const judged = await judgeAnswer(c.question, c.expectedAnswer, actualAnswer);
    results.push({
      caseId: c._id.toString(),
      question: c.question,
      expectedAnswer: c.expectedAnswer,
      actualAnswer,
      siteId: c.siteId,
      score: judged.score,
      verdict: verdictFor(judged.score),
      reasoning: judged.reasoning,
      outcome,
      toolsUsed,
      iterations,
      latencyMs: Date.now() - t,
    });
  }

  const passed = results.filter((r) => r.verdict === "pass").length;
  const partial = results.filter((r) => r.verdict === "partial").length;
  const failed = results.filter((r) => r.verdict === "fail").length;
  const avgScore = Math.round(
    results.reduce((s, r) => s + r.score, 0) / results.length
  );

  const run: AIEvalRun = {
    _id: new ObjectId(),
    status: "completed",
    totalCases: results.length,
    passed,
    partial,
    failed,
    avgScore,
    passThreshold: PASS_THRESHOLD,
    results,
    error: null,
    startedAt,
    finishedAt: new Date(),
    createdBy,
  };

  const runsCol = await getCollection<AIEvalRun>(RUNS_COLLECTION);
  await runsCol.insertOne(run);

  // Prune old runs so history doesn't grow unbounded.
  const old = await runsCol
    .find({})
    .sort({ startedAt: -1 })
    .skip(KEEP_RUNS)
    .project<{ _id: ObjectId }>({ _id: 1 })
    .toArray();
  if (old.length > 0) {
    await runsCol.deleteMany({ _id: { $in: old.map((d) => d._id) } });
  }

  return run;
}
