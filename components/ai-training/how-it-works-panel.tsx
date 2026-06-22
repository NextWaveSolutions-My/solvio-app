import { Fragment } from "react";
import type { LucideIcon } from "lucide-react";
import {
  MessageSquare,
  ShieldCheck,
  Wrench,
  GitBranch,
  CheckCircle2,
  UserPlus,
  Users,
  Filter,
  Scale,
  Shuffle,
  Building2,
  Bell,
  RefreshCw,
  Sparkles,
  BookOpen,
  Database,
  LifeBuoy,
  ArrowRight,
  CircleSlash,
  Ticket,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HowItWorksPanelProps {
  /** Max agentic tool-calling rounds before a final wrap-up reply. */
  maxIterations: number;
  /** Chat messages allowed per visitor IP, per minute. */
  rateLimitPerMinute: number;
  /** Ticket submissions allowed per visitor IP, per hour. */
  ticketRateLimitPerHour: number;
  /** Whether resolved tickets are part of the agent's knowledge. */
  indexResolvedTickets: boolean;
  /** Min similarity score for a Q&A match to count as a confident answer. */
  confidenceThreshold: number;
  agentEnabled: boolean;
  chatbotEnabled: boolean;
}

type Tone = "primary" | "info" | "success" | "destructive" | "muted";

const tone: Record<Tone, { text: string; bg: string; ring: string }> = {
  primary: {
    text: "text-primary",
    bg: "bg-primary/10",
    ring: "ring-primary/20",
  },
  info: { text: "text-info", bg: "bg-info/10", ring: "ring-info/20" },
  success: {
    text: "text-success",
    bg: "bg-success/10",
    ring: "ring-success/20",
  },
  destructive: {
    text: "text-destructive",
    bg: "bg-destructive/10",
    ring: "ring-destructive/20",
  },
  muted: {
    text: "text-muted-foreground",
    bg: "bg-muted",
    ring: "ring-border",
  },
};

/** A single node in a vertical, connected flow. */
function StepNode({
  index,
  icon: Icon,
  color = "primary",
  title,
  children,
  isLast = false,
}: {
  index: number;
  icon: LucideIcon;
  color?: Tone;
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
}) {
  const t = tone[color];
  return (
    <div className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${t.bg} ${t.ring}`}
        >
          <Icon className={`h-5 w-5 ${t.text}`} />
          <span
            className={`absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-background text-[10px] font-bold ring-1 ${t.ring} ${t.text}`}
          >
            {index}
          </span>
        </div>
        {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
      </div>
      <div className={isLast ? "pb-1" : "pb-7"}>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <div className="mt-1.5 space-y-2 text-sm text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

/** One of the agent's read-only retrieval tools. */
function ToolRow({
  icon: Icon,
  name,
  source,
  desc,
  color,
}: {
  icon: LucideIcon;
  name: string;
  source: string;
  desc: string;
  color: Tone;
}) {
  const t = tone[color];
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.bg}`}
      >
        <Icon className={`h-4 w-4 ${t.text}`} />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground">
            {name}
          </code>
          <span className="text-xs text-muted-foreground">→ {source}</span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
    </div>
  );
}

/** A support agent card used in the distribution worked example. */
function AgentChip({
  name,
  dept,
  load,
  maxLoad,
  chosen,
  tied,
}: {
  name: string;
  dept: string;
  load: number;
  maxLoad: number;
  chosen?: boolean;
  tied?: boolean;
}) {
  const pct = Math.round((load / maxLoad) * 100);
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        chosen
          ? "border-success/40 bg-success/5 ring-1 ring-success/30"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
              chosen
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {name.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-semibold leading-none text-foreground">
              {name}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{dept}</p>
          </div>
        </div>
        {chosen && (
          <Badge className="bg-success/15 text-success hover:bg-success/15">
            Assigned
          </Badge>
        )}
        {tied && !chosen && (
          <Badge variant="secondary" className="text-[11px]">
            Tied
          </Badge>
        )}
      </div>
      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Active tickets</span>
          <span className="font-medium text-foreground">{load}</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${
              chosen ? "bg-success" : "bg-muted-foreground/40"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  color = "primary",
  eyebrow,
  title,
  description,
}: {
  icon: LucideIcon;
  color?: Tone;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const t = tone[color];
  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.bg}`}
      >
        <Icon className={`h-5 w-5 ${t.text}`} />
      </div>
      <div>
        <p
          className={`text-[11px] font-semibold uppercase tracking-wider ${t.text}`}
        >
          {eyebrow}
        </p>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function HowItWorksPanel({
  maxIterations,
  rateLimitPerMinute,
  ticketRateLimitPerHour,
  indexResolvedTickets,
  confidenceThreshold,
  agentEnabled,
  chatbotEnabled,
}: HowItWorksPanelProps) {
  const live = agentEnabled && chatbotEnabled;

  return (
    <div className="space-y-6">
      {/* ── Intro / status ─────────────────────────────────────────── */}
      <Card className="overflow-hidden p-0">
        <div className="border-b border-border bg-linear-to-br from-primary/5 via-transparent to-info/5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  How the AI Support Agent works
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The agent is an autonomous chatbot that answers visitors using{" "}
                <strong className="text-foreground">only</strong> your own
                knowledge — never invented facts. When it can&apos;t resolve an
                issue, it asks permission to hand off to a human and auto-routes
                a ticket to the least-busy agent in the right department.
              </p>
            </div>
            <Badge
              className={
                live
                  ? "bg-success/15 text-success hover:bg-success/15"
                  : "bg-muted text-muted-foreground hover:bg-muted"
              }
            >
              <span
                className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
                  live ? "bg-success" : "bg-muted-foreground"
                }`}
              />
              {live ? "Agent is live" : "Agent is off"}
            </Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: BookOpen,
                color: "info" as Tone,
                title: "Answers from your data",
                desc: "Q&A pairs, knowledge base, services & past tickets",
              },
              {
                icon: LifeBuoy,
                color: "primary" as Tone,
                title: "Escalates to humans",
                desc: "Only with the visitor's consent — never silently",
              },
              {
                icon: Scale,
                color: "success" as Tone,
                title: "Balances workload",
                desc: "Routes new tickets to the least-busy agent",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-xl border border-border bg-card/60 p-3"
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone[c.color].bg}`}
                >
                  <c.icon className={`h-4 w-4 ${tone[c.color].text}`} />
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {c.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        <CardContent className="bg-muted/20 pb-6">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <SlidersHorizontal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <strong className="text-foreground">Fully configurable —</strong>{" "}
              not tied to any single model. The agent works with whatever chat
              &amp; embedding models you connect (a hosted provider or your own
              self-hosted model), and the rate limits, reasoning depth &amp;
              confidence threshold described on this page are just your current
              values. Change any of them anytime under the{" "}
              <strong className="text-foreground">Settings</strong> tab.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* ── Section 1: Conversation loop ───────────────────────────── */}
      <Card>
        <CardHeader>
          <SectionTitle
            icon={MessageSquare}
            color="info"
            eyebrow="Stage 1"
            title="The conversation loop"
            description="What happens from the moment a visitor sends a message in the widget."
          />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col">
            <StepNode
              index={1}
              icon={MessageSquare}
              color="info"
              title="Visitor asks a question"
            >
              <p>
                A visitor (guest or signed-in customer) types into the chat
                widget. Recent conversation history is sent along so the agent
                has context.
              </p>
            </StepNode>

            <StepNode
              index={2}
              icon={ShieldCheck}
              color="muted"
              title="Guardrails"
            >
              <p>
                The request is dropped unless the chatbot is enabled and rate
                limits allow it.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Badge variant="secondary">
                  {rateLimitPerMinute} chats / min per visitor
                </Badge>
                <Badge variant="secondary">
                  {ticketRateLimitPerHour} tickets / hour per visitor
                </Badge>
              </div>
            </StepNode>

            <StepNode
              index={3}
              icon={Wrench}
              color="primary"
              title={`Agentic loop — searches your knowledge first (up to ${maxIterations} rounds)`}
            >
              <p>
                Before answering, the agent calls read-only tools to ground its
                reply in real data. It loops, reading results and searching
                again until it has enough — or runs out of rounds.
              </p>
              <div className="grid gap-2 pt-1">
                <ToolRow
                  icon={Sparkles}
                  color="success"
                  name="lookup_faq"
                  source="approved Q&A pairs"
                  desc={`Vetted answers. A match scoring ≥ ${confidenceThreshold.toFixed(
                    2,
                  )} counts as confident and is used almost verbatim.`}
                />
                <ToolRow
                  icon={Database}
                  color="info"
                  name="search_knowledge"
                  source="docs, services & Q&A"
                  desc="Vector search over the knowledge base for product, pricing, feature & how-to questions."
                />
                <ToolRow
                  icon={Ticket}
                  color="primary"
                  name="search_resolved_tickets"
                  source="past solved tickets"
                  desc={
                    indexResolvedTickets
                      ? "Troubleshooting from previously resolved issues. Currently enabled."
                      : "Disabled — resolved tickets are excluded from the index (PII control)."
                  }
                />
              </div>
            </StepNode>

            <StepNode
              index={4}
              icon={GitBranch}
              color="primary"
              title="Decision: resolve or hand off"
              isLast
            >
              <p>
                The agent only states facts that came from a tool. It then
                branches:
              </p>
              <div className="grid gap-2 pt-1 sm:grid-cols-2">
                <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    Resolved
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Replies in 2–5 sentences and logs the outcome:{" "}
                    <code className="rounded bg-muted px-1 text-foreground">
                      answered_faq
                    </code>
                    ,{" "}
                    <code className="rounded bg-muted px-1 text-foreground">
                      answered_kb
                    </code>
                    ,{" "}
                    <code className="rounded bg-muted px-1 text-foreground">
                      answered_resolved_ticket
                    </code>{" "}
                    or{" "}
                    <code className="rounded bg-muted px-1 text-foreground">
                      answered_general
                    </code>
                    .
                  </p>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <UserPlus className="h-4 w-4" />
                    Can&apos;t resolve
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    It does <strong>not</strong> create anything. It asks if the
                    visitor wants a human. Only after they agree does it call{" "}
                    <code className="rounded bg-muted px-1 text-foreground">
                      request_human_handoff
                    </code>
                    , pick the best department, and open the ticket form.
                  </p>
                </div>
              </div>
            </StepNode>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 2: Auto-assignment pipeline ────────────────────── */}
      <Card>
        <CardHeader>
          <SectionTitle
            icon={Scale}
            color="success"
            eyebrow="Stage 2"
            title="Auto ticket assignment"
            description="When a hand-off ticket is created, this pipeline picks exactly one support agent. It is deterministic logic — not the AI guessing."
          />
        </CardHeader>
        <CardContent>
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-info/20 bg-info/5 p-3">
            <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-info" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">First, the bridge:</strong>{" "}
              after consent the agent only opens a short contact form. The{" "}
              <strong className="text-foreground">
                visitor submits their name, email &amp; details
              </strong>
              , and that submission — not the AI — is what creates the ticket
              with the agent&apos;s classified department attached. Only then
              does the routing below run.
            </p>
          </div>
          <div className="flex flex-col">
            <StepNode
              index={1}
              icon={Users}
              color="info"
              title="Build the candidate pool"
            >
              <p>
                Start with every user whose role is{" "}
                <code className="rounded bg-muted px-1 text-foreground">
                  support
                </code>
                .
              </p>
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-xs">
                <CircleSlash className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span>
                  If there are no support agents at all, the ticket is still
                  created — just <strong>unassigned</strong> — and admins are
                  notified.
                </span>
              </div>
            </StepNode>

            <StepNode
              index={2}
              icon={Filter}
              color="info"
              title="Filter to the matched department"
            >
              <p>
                Keep only agents whose{" "}
                <code className="rounded bg-muted px-1 text-foreground">
                  departmentSlugs
                </code>{" "}
                include the department the agent classified the issue into.
              </p>
              <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-2.5 text-xs">
                <RefreshCw className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
                <span>
                  <strong>Fallback:</strong> if no department was classified (or
                  it&apos;s invalid), or no agent covers it, the filter is
                  skipped and the full support pool is used — a ticket is never
                  left unassigned just because a department has no staff.
                </span>
              </div>
            </StepNode>

            <StepNode
              index={3}
              icon={ArrowRight}
              color="muted"
              title="Shortcut for a single candidate"
            >
              <p>
                If exactly one agent remains, it&apos;s assigned immediately —
                no workload math needed.
              </p>
            </StepNode>

            <StepNode
              index={4}
              icon={Building2}
              color="primary"
              title="Count each candidate's live workload"
            >
              <p>
                For every candidate, count their{" "}
                <strong className="text-foreground">active</strong> tickets
                across all four request types:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  "tickets",
                  "installation_requests",
                  "customization_requests",
                  "service_requests",
                ].map((c) => (
                  <code
                    key={c}
                    className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground"
                  >
                    {c}
                  </code>
                ))}
              </div>
              <p className="pt-1">
                &ldquo;Active&rdquo; means status is one of:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  "open",
                  "scheduled_meeting",
                  "in_progress",
                  "waiting_on_customer",
                ].map((s) => (
                  <Badge key={s} variant="secondary" className="text-[11px]">
                    {s}
                  </Badge>
                ))}
              </div>
              <p className="pt-1 text-xs">
                Resolved &amp; closed tickets don&apos;t count — clearing your
                queue frees up capacity for new assignments.
              </p>
            </StepNode>

            <StepNode
              index={5}
              icon={Shuffle}
              color="success"
              title="Least-loaded wins (random tie-break)"
              isLast
            >
              <p>
                The candidate with the <strong>fewest active tickets</strong>{" "}
                gets the ticket. If several are tied at the minimum, one is
                picked <strong>at random</strong> among them.
              </p>
            </StepNode>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 3: Distribution model / ratio ──────────────────── */}
      <Card>
        <CardHeader>
          <SectionTitle
            icon={Scale}
            color="success"
            eyebrow="The ratio & sequence"
            title="How tickets get distributed"
            description="The most common question: is it round-robin or a fixed ratio? Neither."
          />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-success/30 bg-success/5 p-3">
              <p className="text-sm font-semibold text-success">
                ✓ Least-loaded balancing
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Every ticket goes to whoever has the smallest live queue right
                now.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold text-muted-foreground line-through decoration-destructive/60">
                Fixed ratio (e.g. 60/40)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                No preset percentages. The split emerges from who clears tickets
                fastest.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-sm font-semibold text-muted-foreground line-through decoration-destructive/60">
                Round-robin rotation
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                There&apos;s no &ldquo;next in line&rdquo; pointer — each
                decision is computed fresh from current load.
              </p>
            </div>
          </div>

          {/* Worked example */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                Worked example — a new &ldquo;Billing&rdquo; ticket arrives
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Three agents cover the Billing department. The agent with the
              lowest active count wins; B and C tie at 1, so it&apos;s a coin
              flip between them.
            </p>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
              <AgentChip name="Ada" dept="Billing" load={3} maxLoad={3} />
              <AgentChip
                name="Bola"
                dept="Billing"
                load={1}
                maxLoad={3}
                chosen
              />
              <AgentChip
                name="Chidi"
                dept="Billing"
                load={1}
                maxLoad={3}
                tied
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Over many tickets the queues converge toward equal depth, but the
              balance self-corrects to whoever is actually free — not a static
              schedule.
            </p>
          </div>

          {/* Caveat */}
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Concurrency caveat:</strong>{" "}
              workload is read just before the ticket is inserted, with no lock.
              If many tickets are created in the same instant, they can all see
              the same least-loaded agent and pile onto one person. Balancing
              assumes assignments are reasonably spaced apart.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Section 4: After assignment ────────────────────────────── */}
      <Card>
        <CardHeader>
          <SectionTitle
            icon={Bell}
            color="primary"
            eyebrow="Stage 3"
            title="After a ticket is created"
            description="Everything that fires automatically once routing is decided."
          />
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              The ticket is created with:
            </span>
            <Badge variant="secondary" className="text-[11px]">
              status: open
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              priority: medium
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              tag: auto-assigned
            </Badge>
            <span>— a human can re-prioritise or reassign at any time.</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: Bell,
                title: "In-app notifications",
                desc: "The assigned agent and all admins get a new-ticket notification with a deep link.",
              },
              {
                icon: MessageSquare,
                title: "Confirmation email",
                desc: "The customer gets a ticket-created email (when email notifications are enabled).",
              },
              {
                icon: Ticket,
                title: "History trail",
                desc: 'Ticket history records "created" and "assigned" events under the ai-agent actor.',
              },
              {
                icon: RefreshCw,
                title: "Integrations",
                desc: "Standard new-ticket integration notifications (e.g. Slack/webhooks) are sent.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Section 5: Training loop ───────────────────────────────── */}
      <Card>
        <CardHeader>
          <SectionTitle
            icon={RefreshCw}
            color="info"
            eyebrow="The feedback loop"
            title="It gets smarter as you train it"
            description="How the other tabs on this page feed back into the agent's accuracy."
          />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {[
              {
                icon: MessageSquare,
                label: "Chat Logs",
                desc: "Spot questions the agent couldn't answer",
              },
              {
                icon: Sparkles,
                label: "Q&A Pairs",
                desc: "Add an approved answer for it",
              },
              {
                icon: Database,
                label: "Regenerate",
                desc: "Build embeddings so it's searchable",
              },
              {
                icon: CheckCircle2,
                label: "Better answers",
                desc: "Fewer escalations next time",
              },
            ].map((s, i, arr) => (
              <Fragment key={s.label}>
                <div className="flex flex-1 flex-col rounded-xl border border-border bg-card p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10">
                    <s.icon className="h-4 w-4 text-info" />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {s.label}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {s.desc}
                  </p>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex shrink-0 items-center justify-center text-muted-foreground">
                    <ArrowRight className="h-4 w-4 rotate-90 sm:rotate-0" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
