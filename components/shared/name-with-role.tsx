import type React from "react";
import type { Badge } from "@/components/ui/badge";

export function formatRoleLabel(role?: string | null) {
  const r = (role || "").trim().toLowerCase();
  if (!r) return "";
  if (r === "admin") return "Admin";
  if (r === "support") return "Support";
  if (r === "customer") return "Customer";
  return r
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function roleBadgeAppearance(role?: string | null): {
  variant: React.ComponentProps<typeof Badge>["variant"];
  className: string;
} {
  const r = (role || "").trim().toLowerCase();
  if (r === "admin") {
    return {
      variant: "outline",
      className:
        "border-indigo-200 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-400 bg-transparent",
    };
  }
  if (r === "support") {
    return {
      variant: "outline",
      className:
        "border-sky-200 text-sky-600 dark:border-sky-500/30 dark:text-sky-400 bg-transparent",
    };
  }
  if (r === "customer") {
    return {
      variant: "outline",
      className:
        "border-border text-muted-foreground bg-transparent",
    };
  }
  return {
    variant: "outline",
    className: "border-border text-muted-foreground bg-transparent",
  };
}

export function NameWithRole({
  name,
  className,
}: {
  name?: string | null;
  /** Accepted for call-site compatibility; the role label is no longer shown. */
  role?: string | null;
  className?: string;
  badgeClassName?: string;
}) {
  const displayName = (name || "").trim() || "Unknown";
  return <span className={className}>{displayName}</span>;
}
