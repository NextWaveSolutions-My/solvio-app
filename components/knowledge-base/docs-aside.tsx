"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Smile,
  Meh,
  Frown,
  LifeBuoy,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** "Was this helpful?" feedback widget. */
export function DocsFeedback() {
  const [feedback, setFeedback] = useState<"good" | "ok" | "bad" | null>(null);

  const options = [
    { key: "good", icon: Smile },
    { key: "ok", icon: Meh },
    { key: "bad", icon: Frown },
  ] as const;

  return (
    <div>
      <p className="text-sm font-semibold text-foreground">Was this helpful?</p>
      <div className="mt-3 flex items-center gap-2">
        {options.map((opt) => {
          const isActive = feedback === opt.key;
          const Icon = opt.icon;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFeedback(opt.key)}
              aria-label={`Feedback: ${opt.key}`}
              className={cn(
                "flex size-9 items-center justify-center rounded-full border transition-all",
                isActive
                  ? "border-primary/40 bg-primary/10 text-primary ring-2 ring-primary/15"
                  : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
            </button>
          );
        })}
      </div>
      {feedback && (
        <p className="mt-3 text-xs text-muted-foreground">
          Thanks for the feedback!
        </p>
      )}
    </div>
  );
}

/** "Need help?" support card. */
export function DocsHelpCard() {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <div className="flex size-9 items-center justify-center rounded-lg bg-background text-primary shadow-sm ring-1 ring-border">
        <LifeBuoy className="size-4" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">
        Need a hand?
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Can&apos;t find what you&apos;re looking for? Open a ticket and our
        support team will get back to you.
      </p>
      <Link
        href="/dashboard/tickets/new"
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80"
      >
        Create a ticket
        <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}

/** "Related" quick links. */
export function DocsRelated() {
  const links = [
    { label: "Features", href: "/#features", icon: Sparkles },
    { label: "FAQ", href: "/#faq", icon: HelpCircle },
    { label: "Contact", href: "/#contact", icon: Mail },
  ];

  return (
    <div className="space-y-1">
      <p className="px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Related
      </p>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link
            key={link.label}
            href={link.href}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon className="size-3.5" />
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Composed right rail used on the docs home & category pages. */
export function DocsRightRail({ className }: { className?: string }) {
  return (
    <aside className={cn("hidden lg:block", className)}>
      <div className="sticky top-48 space-y-10 px-6 py-10">
        <DocsFeedback />
        <DocsHelpCard />
        <DocsRelated />
      </div>
    </aside>
  );
}
