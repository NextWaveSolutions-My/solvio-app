import { getChatClient } from "@/lib/ai/provider-client";

/**
 * LLM-as-judge.
 *
 * Scores the agent's answer against a human-written reference ("expected")
 * answer for the same question. This is the standard automated way to measure
 * answer quality without a human grading every run — judging *meaning*, not
 * wording. Score is 0–100 (correctness + completeness vs the reference).
 *
 * On any failure we return score 0 with the error as reasoning, so a flaky
 * judge call surfaces as a visible low score rather than crashing the run.
 */

const JUDGE_SYSTEM =
  "You are a strict QA evaluator for a customer-support assistant. Compare the " +
  "assistant's ANSWER to the reference EXPECTED answer for the QUESTION. Judge " +
  "meaning, not wording or style. Score 0-100 for factual correctness and " +
  "completeness relative to EXPECTED: a fully correct and complete answer is " +
  "85-100; partially correct or missing detail is 40-84; incorrect, " +
  "contradictory, or empty is below 40. If EXPECTED indicates the assistant " +
  "should escalate or say it cannot answer, and the ANSWER does so, score high. " +
  'Respond ONLY as JSON: {"score": <0-100>, "reasoning": "<one short sentence>"}.';

export interface JudgeResult {
  score: number;
  reasoning: string;
}

export async function judgeAnswer(
  question: string,
  expected: string,
  actual: string
): Promise<JudgeResult> {
  try {
    const { client, model } = await getChatClient();
    const completion = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: JUDGE_SYSTEM },
        {
          role: "user",
          content: `QUESTION:\n${question}\n\nEXPECTED:\n${expected}\n\nASSISTANT ANSWER:\n${actual}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) return { score: 0, reasoning: "Judge returned no output" };

    const parsed = JSON.parse(raw) as { score?: unknown; reasoning?: unknown };
    let score = Number(parsed.score);
    if (!Number.isFinite(score)) score = 0;
    score = Math.max(0, Math.min(100, Math.round(score)));
    const reasoning = String(parsed.reasoning ?? "").slice(0, 400);
    return { score, reasoning };
  } catch (error) {
    return { score: 0, reasoning: `Judge failed: ${(error as Error).message}` };
  }
}
