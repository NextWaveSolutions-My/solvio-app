import {
  Rocket,
  Zap,
  BookOpen,
  Database,
  CreditCard,
  Sparkles,
  ServerCog,
  Mail,
  Globe,
  Settings,
  Cloud,
  ShieldCheck,
  FileText,
  Terminal,
  Package,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

/**
 * Shared visual system for the documentation surfaces.
 *
 * Knowledge-base categories are user-managed in the database, so they don't
 * carry a fixed colour. We derive a stable accent + fallback icon from the
 * category slug, which keeps a category looking identical across the sidebar,
 * home cards, category header, and article chapter badge.
 */

export type AccentKey =
  | "blue"
  | "violet"
  | "teal"
  | "indigo"
  | "sky"
  | "amber"
  | "emerald"
  | "fuchsia"
  | "rose"
  | "cyan";

export interface AccentClass {
  /** Solid background (icon badges) */
  bg: string;
  /** Accent text */
  text: string;
  /** Focus/active ring */
  ring: string;
  /** Soft tinted background */
  soft: string;
  /** Card header gradient */
  gradient: string;
}

export const accentClasses: Record<AccentKey, AccentClass> = {
  blue: {
    bg: "bg-blue-600",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-200 dark:ring-blue-900",
    soft: "bg-blue-50 dark:bg-blue-950/50",
    gradient: "from-blue-100 via-blue-50 to-cyan-50 dark:from-blue-950/60 dark:via-blue-950/30 dark:to-cyan-950/30",
  },
  violet: {
    bg: "bg-violet-600",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-200 dark:ring-violet-900",
    soft: "bg-violet-50 dark:bg-violet-950/50",
    gradient: "from-violet-100 via-violet-50 to-fuchsia-50 dark:from-violet-950/60 dark:via-violet-950/30 dark:to-fuchsia-950/30",
  },
  teal: {
    bg: "bg-teal-600",
    text: "text-teal-700 dark:text-teal-300",
    ring: "ring-teal-200 dark:ring-teal-900",
    soft: "bg-teal-50 dark:bg-teal-950/50",
    gradient: "from-teal-100 via-teal-50 to-emerald-50 dark:from-teal-950/60 dark:via-teal-950/30 dark:to-emerald-950/30",
  },
  indigo: {
    bg: "bg-indigo-600",
    text: "text-indigo-700 dark:text-indigo-300",
    ring: "ring-indigo-200 dark:ring-indigo-900",
    soft: "bg-indigo-50 dark:bg-indigo-950/50",
    gradient: "from-indigo-100 via-indigo-50 to-blue-50 dark:from-indigo-950/60 dark:via-indigo-950/30 dark:to-blue-950/30",
  },
  sky: {
    bg: "bg-sky-600",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-200 dark:ring-sky-900",
    soft: "bg-sky-50 dark:bg-sky-950/50",
    gradient: "from-sky-100 via-sky-50 to-blue-50 dark:from-sky-950/60 dark:via-sky-950/30 dark:to-blue-950/30",
  },
  amber: {
    bg: "bg-amber-600",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-200 dark:ring-amber-900",
    soft: "bg-amber-50 dark:bg-amber-950/50",
    gradient: "from-amber-100 via-amber-50 to-orange-50 dark:from-amber-950/60 dark:via-amber-950/30 dark:to-orange-950/30",
  },
  emerald: {
    bg: "bg-emerald-600",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-200 dark:ring-emerald-900",
    soft: "bg-emerald-50 dark:bg-emerald-950/50",
    gradient: "from-emerald-100 via-emerald-50 to-teal-50 dark:from-emerald-950/60 dark:via-emerald-950/30 dark:to-teal-950/30",
  },
  fuchsia: {
    bg: "bg-fuchsia-600",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    ring: "ring-fuchsia-200 dark:ring-fuchsia-900",
    soft: "bg-fuchsia-50 dark:bg-fuchsia-950/50",
    gradient: "from-fuchsia-100 via-fuchsia-50 to-pink-50 dark:from-fuchsia-950/60 dark:via-fuchsia-950/30 dark:to-pink-950/30",
  },
  rose: {
    bg: "bg-rose-600",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-200 dark:ring-rose-900",
    soft: "bg-rose-50 dark:bg-rose-950/50",
    gradient: "from-rose-100 via-rose-50 to-pink-50 dark:from-rose-950/60 dark:via-rose-950/30 dark:to-pink-950/30",
  },
  cyan: {
    bg: "bg-cyan-600",
    text: "text-cyan-700 dark:text-cyan-300",
    ring: "ring-cyan-200 dark:ring-cyan-900",
    soft: "bg-cyan-50 dark:bg-cyan-950/50",
    gradient: "from-cyan-100 via-cyan-50 to-sky-50 dark:from-cyan-950/60 dark:via-cyan-950/30 dark:to-sky-950/30",
  },
};

const accentOrder: AccentKey[] = [
  "blue",
  "violet",
  "teal",
  "indigo",
  "sky",
  "amber",
  "emerald",
  "fuchsia",
  "rose",
  "cyan",
];

const fallbackIcons: LucideIcon[] = [
  Rocket,
  Zap,
  BookOpen,
  Database,
  CreditCard,
  Sparkles,
  ServerCog,
  Mail,
  Globe,
  Settings,
  Cloud,
  ShieldCheck,
  FileText,
  Terminal,
  Package,
  LifeBuoy,
];

/** Stable, non-negative hash for a string. */
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Deterministic accent for a category slug. */
export function accentForSlug(slug: string): AccentKey {
  return accentOrder[hash(slug) % accentOrder.length];
}

/** Deterministic lucide fallback icon for a category slug. */
export function iconForSlug(slug: string): LucideIcon {
  return fallbackIcons[hash(`${slug}-icon`) % fallbackIcons.length];
}
