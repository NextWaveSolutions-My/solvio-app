"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  Loader2,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import type {
  AIEvalCasePublic,
  AIEvalRunPublic,
  AIEvalVerdict,
  AISitePublic,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listEvalCases,
  createEvalCase,
  deleteEvalCase,
  runEvaluation,
} from "@/actions/ai-eval";
import { SiteSelect } from "@/components/ai-training/site-select";

const VERDICT_STYLES: Record<AIEvalVerdict, string> = {
  pass: "border-success/40 bg-success/10 text-success",
  partial: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  fail: "border-destructive/40 bg-destructive/10 text-destructive",
};

function scoreColor(score: number): string {
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-amber-600";
  return "text-destructive";
}

function AddCaseDialog({
  sites,
  onAdded,
}: {
  sites: AISitePublic[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [siteId, setSiteId] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!question.trim() || !expectedAnswer.trim()) {
      toast.error("Question and expected answer are required");
      return;
    }
    setSaving(true);
    try {
      const result = await createEvalCase({
        question: question.trim(),
        expectedAnswer: expectedAnswer.trim(),
        category: category.trim() || undefined,
        siteId: siteId || undefined,
      });
      if (result.success) {
        toast.success("Case added");
        setQuestion("");
        setExpectedAnswer("");
        setCategory("");
        setSiteId("");
        setOpen(false);
        onAdded();
      } else {
        toast.error(result.error ?? "Failed to add case");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add case
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add an evaluation case</DialogTitle>
          <DialogDescription>
            A real customer question and the answer the AI should give. Runs are
            scored by comparing the agent&apos;s answer against this expected
            answer.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="eval-q">Question</Label>
            <Textarea
              id="eval-q"
              rows={2}
              placeholder="e.g. How do I upgrade my plan?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eval-a">Expected answer</Label>
            <Textarea
              id="eval-a"
              rows={4}
              placeholder="The correct answer the agent should produce…"
              value={expectedAnswer}
              onChange={(e) => setExpectedAnswer(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eval-cat">Category (optional)</Label>
            <Input
              id="eval-cat"
              placeholder="e.g. Billing"
              value={category}
              maxLength={100}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          <SiteSelect
            id="eval-site"
            value={siteId}
            onChange={setSiteId}
            sites={sites}
            disabled={saving}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RunSummary({
  run,
  sites,
}: {
  run: AIEvalRunPublic;
  sites: AISitePublic[];
}) {
  const passRate = run.totalCases
    ? Math.round((run.passed / run.totalCases) * 100)
    : 0;
  const [expanded, setExpanded] = useState<string | null>(null);
  const siteName = useCallback(
    (siteId?: string) =>
      siteId
        ? (sites.find((s) => s._id === siteId)?.name ?? "Unknown site")
        : "Global / all",
    [sites]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Latest run</CardTitle>
        <CardDescription>
          {run.finishedAt
            ? `Ran ${new Date(run.finishedAt).toLocaleString()}`
            : "In progress"}{" "}
          · pass threshold {run.passThreshold}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Pass rate</p>
            <p className={`text-2xl font-bold ${scoreColor(passRate)}`}>
              {passRate}%
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Avg score</p>
            <p className={`text-2xl font-bold ${scoreColor(run.avgScore)}`}>
              {run.avgScore}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">Cases</p>
            <p className="text-2xl font-bold text-foreground">
              {run.totalCases}
            </p>
          </div>
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs text-muted-foreground">P / Pt / F</p>
            <p className="text-2xl font-bold">
              <span className="text-success">{run.passed}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-amber-600">{run.partial}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-destructive">{run.failed}</span>
            </p>
          </div>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border">
          {run.results.map((r) => {
            const isOpen = expanded === r.caseId;
            return (
              <li key={r.caseId}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : r.caseId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                >
                  <span className={`w-9 text-sm font-bold ${scoreColor(r.score)}`}>
                    {r.score}
                  </span>
                  <Badge
                    variant="outline"
                    className={`${VERDICT_STYLES[r.verdict]} shrink-0`}
                  >
                    {r.verdict}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {r.question}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {siteName(r.siteId)} · {r.outcome.replace(/_/g, " ")} ·{" "}
                    {r.latencyMs}ms
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-border bg-muted/20 px-4 py-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Expected
                      </p>
                      <p className="whitespace-pre-wrap text-foreground">
                        {r.expectedAnswer}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Agent answer
                      </p>
                      <p className="whitespace-pre-wrap text-foreground">
                        {r.actualAnswer}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Judge reasoning
                      </p>
                      <p className="text-muted-foreground">{r.reasoning}</p>
                      {r.toolsUsed.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Tools: {r.toolsUsed.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export function EvaluationPanel({
  initialCases,
  initialLatestRun,
  sites,
}: {
  initialCases: AIEvalCasePublic[];
  initialLatestRun: AIEvalRunPublic | null;
  sites: AISitePublic[];
}) {
  const router = useRouter();
  const [cases, setCases] = useState(initialCases);
  const [latestRun, setLatestRun] = useState(initialLatestRun);
  const [running, setRunning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await listEvalCases();
    if (result.success && result.data) setCases(result.data);
  }, []);

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await runEvaluation();
      if (result.success && result.data) {
        setLatestRun(result.data);
        toast.success(
          `Evaluation complete — ${result.data.passed}/${result.data.totalCases} passed`
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Evaluation failed");
      }
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const result = await deleteEvalCase(id);
      if (result.success) {
        await refresh();
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    } finally {
      setBusyId(null);
    }
  };

  const siteName = useCallback(
    (siteId?: string) =>
      siteId
        ? (sites.find((s) => s._id === siteId)?.name ?? "Unknown site")
        : "Global / all",
    [sites]
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">Evaluation cases</CardTitle>
            <CardDescription>
              {cases.length === 0
                ? "Add real questions with their correct answers to measure quality."
                : `${cases.length} case${cases.length === 1 ? "" : "s"} · scored by an LLM judge against the expected answer`}
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-2">
            <AddCaseDialog sites={sites} onAdded={refresh} />
            <Button
              size="sm"
              onClick={handleRun}
              disabled={running || cases.length === 0}
            >
              {running ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="mr-1.5 h-3.5 w-3.5" />
              )}
              {running ? "Running…" : "Run evaluation"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cases.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No cases yet. Add a few representative questions with their ideal
              answers, then run an evaluation to get a pass rate and per-answer
              scores.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {cases.map((c) => (
                <li
                  key={c._id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.question}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      [{siteName(c.siteId)}] {c.category ? `[${c.category}] ` : ""}
                      {c.expectedAnswer}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 text-destructive hover:text-destructive"
                        disabled={busyId === c._id}
                      >
                        {busyId === c._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete case</AlertDialogTitle>
                        <AlertDialogDescription>
                          Delete this evaluation case? This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(c._id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {latestRun && <RunSummary run={latestRun} sites={sites} />}
    </div>
  );
}
