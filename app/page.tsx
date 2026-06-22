import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Bot,
  Bug,
  CalendarClock,
  ChartNoAxesCombined,
  CheckCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  FileText,
  FolderKanban,
  Headphones,
  HelpCircle,
  Lightbulb,
  Lock,
  LucideIcon,
  Mail,
  MessageCircle,
  MessageSquareText,
  Paperclip,
  Search,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { ContactForm } from "@/components/home/contact-form";
import { FAQAccordion } from "@/components/home/faq-accordion";
import { NewsletterForm } from "@/components/newsletter/newsletter-form";
import { getPublicLandingContent } from "@/actions/landing-page";
import { LandingPageContent } from "@/types/landing-page";

const iconMap: Record<string, LucideIcon> = {
  Bell,
  BookOpen,
  Bug,
  CalendarClock,
  ChartNoAxesCombined,
  CheckCircle,
  Clock3,
  CreditCard,
  Download,
  FileText,
  FolderKanban,
  Headphones,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  MessageSquareText,
  Paperclip,
  Search,
  Shield,
  Sparkles,
  Ticket,
  Users,
  Wrench,
  Zap,
};

export const dynamic = "force-dynamic";

const sortEnabled = <T extends { enabled: boolean; order: number }>(
  items: T[],
) => items.filter((item) => item.enabled).sort((a, b) => a.order - b.order);

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <SectionLabel>{eyebrow}</SectionLabel>
      <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
        {description}
      </p>
    </div>
  );
}

/* Decorative "track your request" mockup rendered in the hero. Pure CSS — no screenshots. */
function HeroTicketMockup() {
  const statusSteps = [
    { label: "Submitted", time: "9:14 AM", state: "done" },
    { label: "Assigned", time: "9:18 AM", state: "done" },
    { label: "In progress", time: "Now", state: "current" },
    { label: "Resolved", time: "Pending", state: "upcoming" },
  ] as const;

  return (
    <div aria-hidden className="relative mx-auto mt-16 max-w-4xl select-none sm:mt-20">
      {/* Glow behind the window */}
      <div className="absolute -inset-x-10 -top-10 bottom-10 -z-10 rounded-[40px] bg-linear-to-b from-primary/20 via-primary/5 to-transparent blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card text-left shadow-2xl shadow-primary/10 ring-1 ring-border/40">
        {/* Window chrome */}
        <div className="flex items-center gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </div>
          <div className="mx-auto flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1 text-[11px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            solvio.app/support/ticket/SLV-4821
          </div>
          <div className="w-12" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px]">
          {/* Request thread */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  Custom domain not connecting
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Request #SLV-4821 · updated 2 min ago
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                In Progress
              </span>
            </div>

            {/* Status timeline — customers always see where their request stands */}
            <div className="border-b border-border/60 px-5 py-4">
              <div className="flex items-start">
                {statusSteps.map((step, index) => (
                  <div
                    key={step.label}
                    className="flex flex-1 items-start last:flex-none"
                  >
                    <div className="flex flex-col items-center">
                      {step.state === "done" ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <CheckCircle2 className="h-3 w-3" />
                        </span>
                      ) : step.state === "current" ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary">
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        </span>
                      ) : (
                        <span className="h-5 w-5 rounded-full border-2 border-dashed border-border" />
                      )}
                      <span className="mt-1.5 whitespace-nowrap text-[10px] font-semibold text-foreground/80">
                        {step.label}
                      </span>
                      <span className="text-[9px] text-muted-foreground">
                        {step.time}
                      </span>
                    </div>
                    {index < statusSteps.length - 1 && (
                      <div
                        className={`mx-2 mt-2.5 h-0.5 flex-1 rounded-full ${
                          step.state === "done"
                            ? "bg-emerald-500/60"
                            : "bg-border"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Conversation */}
            <div className="flex-1 space-y-3.5 px-5 py-4">
              <div className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                  You
                </span>
                <div className="rounded-xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5">
                  <p className="text-[12px] leading-relaxed text-foreground/90">
                    DNS records were added yesterday but the domain still shows
                    &ldquo;not verified&rdquo;. Screenshot attached.
                  </p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                    <Paperclip className="h-2.5 w-2.5" />
                    dns-settings.png
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                    <Sparkles className="h-3 w-3" />
                    AI Assistant · replied in seconds
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Instant answer
                  </span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-foreground/85">
                  Your CNAME currently points to the apex domain — point it to{" "}
                  <span className="font-medium text-foreground">
                    edge.solvio.app
                  </span>{" "}
                  instead. Here is the step-by-step guide:
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                    <BookOpen className="h-2.5 w-2.5" />
                    Docs · Custom domains
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
                    <FileText className="h-2.5 w-2.5" />
                    KB · DNS setup
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[10px] font-bold text-violet-600 dark:text-violet-400">
                  EL
                </span>
                <div className="rounded-xl rounded-tl-sm bg-muted/60 px-3.5 py-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground">
                    Elena · Support team · 2 min ago
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-foreground/90">
                    I checked from our side and one record still needs an
                    update — sending you the exact values now.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Request details sidebar */}
          <div className="hidden border-l border-border/60 p-4 lg:block">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Request details
              </p>
              <div className="mt-2.5 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    In Progress
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Priority</span>
                  <span className="font-semibold text-foreground">High</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Assigned to</span>
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-violet-500/15 text-[8px] font-bold text-violet-600 dark:text-violet-400">
                      EL
                    </span>
                    Elena W.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-2.5 rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Stay in the loop
              </p>
              <div className="mt-2 flex items-start gap-2">
                <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <p className="text-[11px] leading-relaxed text-foreground/80">
                  Email &amp; push updates on every reply and status change —
                  no need to keep checking back.
                </p>
              </div>
            </div>

            <div className="mt-2.5 rounded-lg border border-border/60 bg-muted/30 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Need more?
              </p>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5 text-[11px] font-medium text-foreground/85">
                  <CalendarClock className="h-3 w-3 text-primary" />
                  Book a meeting with the team
                </div>
                <div className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5 text-[11px] font-medium text-foreground/85">
                  <Paperclip className="h-3 w-3 text-primary" />
                  Attach more files anytime
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating notification cards */}
      <div className="absolute -right-10 -top-7 hidden items-center gap-3 rounded-xl border border-border/70 bg-card/90 p-3.5 shadow-xl backdrop-blur xl:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bell className="h-4.5 w-4.5" />
        </span>
        <div>
          <p className="text-[12px] font-semibold text-foreground">
            Status updated
          </p>
          <p className="text-[10px] text-muted-foreground">
            In Progress · just now
          </p>
        </div>
      </div>
      <div className="absolute -bottom-6 -left-12 hidden items-center gap-3 rounded-xl border border-border/70 bg-card/90 p-3.5 shadow-xl backdrop-blur xl:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-[11px] font-bold text-violet-600 dark:text-violet-400">
          EL
        </span>
        <div>
          <p className="text-[12px] font-semibold text-foreground">
            New reply from Elena
          </p>
          <p className="text-[10px] text-muted-foreground">
            also sent to your email
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const result = await getPublicLandingContent();
  const content = result.data as LandingPageContent;

  const supportPaths = sortEnabled(content.supportPaths || []);
  const workflowSteps = sortEnabled(content.workflowSteps || []);
  const capabilities = sortEnabled(content.capabilities || []);
  const faqItems = sortEnabled(content.faq || []);
  // Proof data may predate the enabled/order fields, so only drop explicit
  // opt-outs instead of requiring enabled === true.
  const partners = (content.proof?.partners || [])
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const testimonials = (content.proof?.testimonials || [])
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const proofStats = content.proof?.stats || [];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader variant="landing" header={content.header} />

      <main className="flex-1 overflow-x-clip">
        {/* ── Hero ── */}
        <section
          id="overview"
          className="relative scroll-mt-24 px-4 pb-20 pt-16 sm:pt-24"
        >
          {/* Ambient background */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_55%,transparent_100%)] opacity-40"
          />
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 -z-10 h-[760px] bg-[radial-gradient(ellipse_75%_55%_at_50%_-12%,var(--primary-soft),transparent_65%)]"
          />
          <div
            aria-hidden
            className="absolute left-[6%] top-44 -z-10 h-72 w-72 rounded-full bg-info/10 blur-[110px]"
          />
          <div
            aria-hidden
            className="absolute right-[8%] top-80 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-[120px]"
          />

          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-background/70 py-1.5 pl-4 pr-4.5 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-[13px] font-medium text-foreground/80">
                {content.hero.eyebrow}
              </span>
            </div>

            <h1 className="mx-auto mt-6 max-w-3xl text-balance bg-linear-to-br from-foreground via-foreground to-foreground/55 bg-clip-text text-4xl font-extrabold leading-[1.08] tracking-tight text-transparent sm:text-5xl md:text-6xl">
              {content.hero.headline}
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-balance text-[16px] leading-relaxed text-muted-foreground sm:text-lg">
              {content.hero.description}
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={content.hero.primaryButtonLink}
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-8 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] sm:w-auto"
              >
                {content.hero.primaryButtonText}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={content.hero.secondaryButtonLink}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-8 text-[15px] font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/30 hover:bg-muted/60 sm:w-auto"
              >
                {content.hero.secondaryButtonText}
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                No login needed to open a ticket
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Instant AI answers, day or night
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Live status on every request
              </span>
            </div>
          </div>

          <HeroTicketMockup />

          {/* Metrics */}
          <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border/60">
            {content.hero.metrics.map((metric) => (
              <div
                key={metric.id}
                className="flex flex-col items-center justify-center px-6 text-center"
              >
                <p className="bg-linear-to-br from-foreground to-foreground/60 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
                  {metric.value}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Support Paths ── */}
        <section
          id="support-paths"
          className="relative scroll-mt-24 px-4 py-20 sm:py-24"
        >
          {/* Legacy nav links may still point at the old #services anchor */}
          <span id="services" aria-hidden className="absolute top-0 scroll-mt-24" />
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              centered
              eyebrow="Support Paths"
              title="What do you need help with today?"
              description="Pick the path that matches your situation — your request reaches the right people and the right workflow from the first click."
            />

            <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {supportPaths.map((path) => {
                const Icon = iconMap[path.icon] || HelpCircle;
                return (
                  <Link
                    key={path.id}
                    href={path.link}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
                  >
                    <div
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${path.colorClass}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-5 text-[16px] font-bold text-foreground">
                      {path.title}
                    </p>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                      {path.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        {path.badge}
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Partner marquee ── */}
        {partners.length > 0 && (
          <section className="px-4 py-12">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Trusted by customers and teams worldwide
            </p>
            <div className="relative mx-auto mt-6 max-w-5xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
              <div className="flex w-max animate-[marquee_36s_linear_infinite] motion-reduce:animate-none">
                {[0, 1].map((copy) => (
                  <div
                    key={copy}
                    aria-hidden={copy === 1}
                    className="flex shrink-0 items-center gap-16 pr-16"
                  >
                    {partners.map((partner) => (
                      <span
                        key={`${copy}-${partner.id}`}
                        className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground/40 transition-colors hover:text-foreground/70"
                      >
                        {partner.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={partner.logoUrl}
                            alt={partner.displayName}
                            className="h-7 w-auto opacity-60 grayscale"
                          />
                        ) : (
                          partner.displayName
                        )}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── What you can expect ── */}
        <section className="px-4 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
            {[
              {
                icon: Zap,
                title: "Fast first response",
                body: "Your request is routed to the right person the moment you submit it — no generic inbox, no black hole.",
              },
              {
                icon: Bell,
                title: "You always know where things stand",
                body: "Follow live status changes and get notified about every reply — by email, push, and right here in the portal.",
              },
              {
                icon: ShieldCheck,
                title: "Your context never gets lost",
                body: "Files, screenshots, and the full conversation stay attached to your request from first message to resolution.",
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-7 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div
                  aria-hidden
                  className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-primary/5 blur-2xl transition-opacity group-hover:bg-primary/10"
                />
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                  <pillar.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-[17px] font-bold text-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted-foreground">
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── AI Assistant ── */}
        <section className="relative px-4 py-20 sm:py-24">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(55%_70%_at_82%_42%,var(--primary-soft),transparent_70%)]"
          />
          <div
            aria-hidden
            className="absolute -left-20 bottom-8 -z-10 h-72 w-72 rounded-full bg-info/10 blur-[110px]"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Copy */}
            <div>
              <SectionLabel>AI Assistant</SectionLabel>
              <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Get answers in seconds, any hour.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                Before you wait in any queue, ask our AI assistant. It answers
                instantly from our documentation — and brings in a real person
                the moment one is needed.
              </p>

              <div className="mt-8 space-y-5">
                {[
                  {
                    icon: Clock3,
                    title: "Instant help, 24/7",
                    body: "Common questions get answered in seconds — nights, weekends, and holidays included.",
                  },
                  {
                    icon: BookOpen,
                    title: "Grounded in real documentation",
                    body: "Every answer comes from our docs and guides, with links to the source so you can read more.",
                  },
                  {
                    icon: Users,
                    title: "A human is always one step away",
                    body: "If the assistant can't solve it, it opens a ticket with your conversation attached — you never have to repeat yourself.",
                  },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                      <feature.icon className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-bold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                        {feature.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat mockup */}
            <div aria-hidden className="relative select-none">
              <div
                className="absolute -inset-4 -z-10 rounded-[32px] bg-linear-to-br from-primary/20 to-transparent blur-2xl"
              />
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 shadow-2xl">
                <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-sky-400">
                    <Bot className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-white">
                      Solvio Assistant
                    </p>
                    <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Online · knows our entire documentation
                    </p>
                  </div>
                </div>

                <div className="space-y-4 px-5 py-5 text-[13px]">
                  <div className="flex justify-end">
                    <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-sky-500/20 px-4 py-2.5 leading-relaxed text-sky-100">
                      How do I connect a custom domain?
                    </p>
                  </div>

                  <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-white/8 bg-white/5 px-4 py-3">
                    <p className="leading-relaxed text-neutral-200">
                      Three steps: add a CNAME record pointing to{" "}
                      <span className="font-medium text-white">
                        edge.solvio.app
                      </span>
                      , verify it in Settings → Domains, then wait up to 10
                      minutes for SSL to issue.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-400">
                        <BookOpen className="h-2.5 w-2.5" />
                        Docs · Custom domains
                      </span>
                      <span className="ml-auto text-[10px] text-neutral-600">
                        answered in 1.8s
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <p className="max-w-[80%] rounded-2xl rounded-br-sm bg-sky-500/20 px-4 py-2.5 leading-relaxed text-sky-100">
                      Still not verifying after 24 hours…
                    </p>
                  </div>

                  <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-white/8 bg-white/5 px-4 py-3">
                    <p className="leading-relaxed text-neutral-200">
                      That&apos;s unusual — I&apos;ve opened ticket{" "}
                      <span className="font-medium text-white">#4823</span> with
                      this conversation attached and notified the team.
                    </p>
                    <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                      <Users className="h-3 w-3" />
                      Human handoff · full context shared
                    </span>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 py-2.5 pl-4 pr-2">
                    <span className="text-[13px] text-neutral-500">
                      Ask anything about the product…
                    </span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Send className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section
          id="how-it-works"
          className="relative scroll-mt-24 px-4 py-20 sm:py-24"
        >
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(50%_65%_at_12%_35%,var(--info-soft),transparent_70%)]"
          />
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              centered
              eyebrow="How It Works"
              title="From first question to final resolution"
              description="Here's exactly what happens after you reach out — from your first message to the confirmed fix."
            />

            <div className="relative mt-16">
              <div
                aria-hidden
                className="absolute left-0 right-0 top-6 hidden h-px bg-linear-to-r from-transparent via-border to-transparent lg:block"
              />
              <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                {workflowSteps.map((step, index) => {
                  const Icon = iconMap[step.icon] || CheckCircle;
                  return (
                    <div key={step.id} className="relative flex flex-col items-start">
                      <div className="flex items-center gap-3">
                        <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-background text-primary shadow-sm ring-4 ring-background">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="text-[28px] font-extrabold tabular-nums text-foreground/10">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <h3 className="mt-4 text-[15px] font-bold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="scroll-mt-24 px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              centered
              eyebrow="Features"
              title="Everything you can do from the portal"
              description="Open and track tickets, search the docs, message support, share files, and book meetings — every way to get help, in one place."
            />

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((capability) => {
                const Icon = iconMap[capability.icon] || Sparkles;
                return (
                  <Link
                    key={capability.id}
                    href={capability.link}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
                  >
                    <div
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                    />
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
                        <Icon className="h-5 w-5" />
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground/0 transition-all group-hover:text-muted-foreground" />
                    </div>
                    <h3 className="mt-5 text-[16px] font-bold text-foreground">
                      {capability.title}
                    </h3>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                      {capability.description}
                    </p>
                    <span className="mt-5 inline-flex w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                      {capability.badge}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Self-service + Human support split ── */}
        <section className="px-4 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-2">
            {/* Self-service */}
            <div className="flex flex-col rounded-3xl border border-border/60 bg-card p-8">
              <SectionLabel>Self-service first</SectionLabel>
              <h3 className="mt-4 text-balance text-2xl font-bold tracking-tight text-foreground">
                Find answers in seconds — no waiting required.
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                Search the knowledge base for setup steps, known issues, and
                how-to guides any time. And if you don&apos;t find it, ticket
                creation is one click away.
              </p>

              <div className="mt-7 flex-1 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background px-4 py-3 text-[13px] text-muted-foreground shadow-sm">
                  <Search className="h-4 w-4 text-primary" />
                  Search guides, known issues, setup steps…
                  <span className="ml-auto hidden rounded border border-border/60 px-1.5 py-0.5 text-[10px] font-medium sm:block">
                    ⌘K
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { icon: Download, label: "Installation & setup guide", views: "2.4k views" },
                    { icon: Bug, label: "Known issues & workarounds", views: "1.8k views" },
                    { icon: CreditCard, label: "Billing & license questions", views: "1.1k views" },
                  ].map((article) => (
                    <div
                      key={article.label}
                      className="flex items-center gap-3 rounded-xl bg-background px-4 py-3"
                    >
                      <article.icon className="h-4 w-4 text-primary" />
                      <span className="flex-1 text-[13px] font-medium text-foreground">
                        {article.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {article.views}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href="/docs"
                className="group mt-7 inline-flex items-center gap-1.5 text-[14px] font-semibold text-primary"
              >
                Browse the knowledge base
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Human support */}
            <div className="flex flex-col rounded-3xl border border-white/10 bg-neutral-950 p-8 text-neutral-100">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-400">
                Human when it matters
              </span>
              <h3 className="mt-4 text-balance text-2xl font-bold tracking-tight">
                Bring the tricky problems straight to our team.
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-neutral-400">
                Open a ticket, message support, share files, and schedule a
                meeting — your context follows the whole way, so you never
                have to start over.
              </p>

              <div className="mt-7 flex-1 space-y-2.5">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="h-4 w-4 text-sky-400" />
                    <p className="text-[13px] font-semibold">
                      Live replies & notifications
                    </p>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
                    Real-time replies and notifications keep your request
                    moving — no email ping-pong.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center gap-2.5">
                    <Paperclip className="h-4 w-4 text-violet-400" />
                    <p className="text-[13px] font-semibold">
                      Files attached to the issue
                    </p>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
                    Your screenshots, logs, and documents stay connected to the
                    same request — always easy to find.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <div className="flex items-center gap-2.5">
                    <CalendarClock className="h-4 w-4 text-emerald-400" />
                    <p className="text-[13px] font-semibold">
                      Meetings for the big stuff
                    </p>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
                    Move to a scheduled call without re-explaining anything.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/support/new"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[13px] font-semibold text-neutral-950 transition-opacity hover:opacity-90"
                >
                  Create Ticket
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/dashboard/messages"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/8"
                >
                  Open Messages
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Proof: stats + testimonials ── */}
        <section className="relative px-4 py-20 sm:py-24">
          <div
            aria-hidden
            className="absolute left-1/2 top-44 -z-10 h-72 w-[680px] max-w-full -translate-x-1/2 rounded-full bg-primary/10 blur-[130px]"
          />
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              centered
              eyebrow={content.proof.eyebrow}
              title={content.proof.headline}
              description={content.proof.description}
            />

            {proofStats.length > 0 && (
              <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border/60">
                {proofStats.map((stat) => (
                  <div
                    key={stat.id}
                    className="flex flex-col items-center px-6 text-center"
                  >
                    <p className="bg-linear-to-br from-primary to-primary/55 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-[12px] font-medium leading-snug text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {testimonials.length > 0 && (
              <div
                className={`mx-auto mt-14 grid gap-5 ${
                  testimonials.length >= 3
                    ? "md:grid-cols-3"
                    : testimonials.length === 2
                      ? "max-w-4xl md:grid-cols-2"
                      : "max-w-xl"
                }`}
              >
                {testimonials.map((testimonial) => (
                  <figure
                    key={testimonial.id}
                    className="flex flex-col rounded-2xl border border-border/60 bg-card p-7"
                  >
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < testimonial.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-border"
                          }`}
                        />
                      ))}
                    </div>
                    <blockquote className="mt-4 flex-1 text-[14px] leading-relaxed text-foreground/85">
                      &ldquo;{testimonial.text}&rdquo;
                    </blockquote>
                    <figcaption className="mt-6 flex items-center gap-3 border-t border-border/60 pt-5">
                      {testimonial.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={testimonial.imageUrl}
                          alt={testimonial.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                          {testimonial.initials}
                        </span>
                      )}
                      <div>
                        <p className="text-[13px] font-bold text-foreground">
                          {testimonial.name}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {testimonial.role}
                        </p>
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            <p className="mx-auto mt-12 flex max-w-2xl items-center justify-center gap-2 text-center text-[13px] text-muted-foreground">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
              {content.proof.trustStatement}
            </p>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="scroll-mt-24 px-4 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHeading
              centered
              eyebrow="FAQ"
              title="Frequently asked questions"
              description="Got questions? We've got answers. If you can't find what you're looking for, our support team is one message away."
            />

            <FAQAccordion items={faqItems} />
          </div>
        </section>

        {/* ── Contact ── */}
        <section
          id="contact"
          className="relative scroll-mt-24 px-4 py-20 sm:py-24"
        >
          <div
            aria-hidden
            className="absolute right-[4%] top-24 -z-10 h-80 w-80 rounded-full bg-primary/10 blur-[120px]"
          />
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div>
              <SectionLabel>{content.contactCta.eyebrow}</SectionLabel>
              <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {content.contactCta.headline}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                {content.contactCta.description}
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: Ticket,
                    title: content.contactCta.primaryButtonText,
                    body: "Tracked from first reply to resolution.",
                    href: content.contactCta.primaryButtonLink,
                  },
                  {
                    icon: BookOpen,
                    title: content.contactCta.secondaryButtonText,
                    body: "Self-service answers, available 24/7.",
                    href: content.contactCta.secondaryButtonLink,
                  },
                ].map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/30"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <item.icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-[14px] font-bold text-foreground">
                        {item.title}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>

            </div>

            <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-xl shadow-primary/5 sm:p-8">
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                {content.contactCta.formTitle}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {content.contactCta.formDescription}
              </p>
              <div className="mt-6">
                <ContactForm variant="compact" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Newsletter ── */}
        <section className="px-4 pb-20 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 shadow-sm sm:p-12">
              <div
                aria-hidden
                className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-[90px]"
              />
              <div
                aria-hidden
                className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-primary/5 blur-[90px]"
              />
              <div className="relative grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
                <div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
                    <Mail className="h-5 w-5" />
                  </span>
                  <h2 className="mt-5 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Product updates & support tips
                  </h2>
                  <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
                    A short monthly email with release notes, practical guides,
                    and reliability updates — the useful stuff only.
                  </p>
                </div>
                <div>
                  <NewsletterForm
                    placeholder="Enter your work email"
                    buttonText="Subscribe"
                    formClassName="flex w-full flex-col gap-3 sm:flex-row"
                    inputClassName="h-12 flex-1 rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                    buttonClassName="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  />
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    No spam. Unsubscribe anytime.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="px-4 pb-24">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-4xl bg-linear-to-br from-primary via-primary to-info px-6 py-16 text-center shadow-2xl shadow-primary/25 sm:px-16 sm:py-20">
            <div
              aria-hidden
              className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_40%,transparent_100%)]"
            />
            <div
              aria-hidden
              className="absolute -top-24 left-1/2 h-64 w-[560px] -translate-x-1/2 rounded-full bg-white/15 blur-[100px]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(90%_90%_at_85%_100%,rgb(0_0_0/0.22),transparent_55%)]"
            />

            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-foreground/90 backdrop-blur">
                <Sparkles className="h-3 w-3" />
                We&apos;re here to help
              </span>
              <h2 className="mx-auto mt-5 max-w-2xl text-balance text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
                Still need a hand? We&apos;re one message away.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-balance text-[15px] leading-relaxed text-primary-foreground/80">
                Open a ticket, search the knowledge base, or ask the AI
                assistant — no account required, no waiting on hold.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href={content.hero.primaryButtonLink}
                  className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-8 text-[15px] font-semibold text-neutral-950 shadow-lg transition-all hover:shadow-xl active:scale-[0.98] sm:w-auto"
                >
                  {content.hero.primaryButtonText}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={content.hero.secondaryButtonLink}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/30 px-8 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-white/10 sm:w-auto"
                >
                  {content.hero.secondaryButtonText}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <PublicFooter content={content.footer} />
      </main>
    </div>
  );
}
