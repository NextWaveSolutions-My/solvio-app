import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@/types";

/** Treats a missing/unknown status as "active" (legacy users have no field). */
export function normalizeAccountStatus(status?: string | null): AccountStatus {
    return status === "disabled" || status === "banned" ? status : "active";
}

const APPEARANCE: Record<
    AccountStatus,
    { label: string; dot: string; className: string }
> = {
    active: {
        label: "Active",
        dot: "bg-emerald-500",
        className:
            "border-emerald-200 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400 bg-transparent",
    },
    disabled: {
        label: "Disabled",
        dot: "bg-amber-500",
        className:
            "border-amber-200 text-amber-600 dark:border-amber-500/30 dark:text-amber-400 bg-transparent",
    },
    banned: {
        label: "Banned",
        dot: "bg-rose-500",
        className:
            "border-rose-200 text-rose-600 dark:border-rose-500/30 dark:text-rose-400 bg-transparent",
    },
};

export function AccountStatusBadge({
    status,
    className,
}: {
    status?: string | null;
    className?: string;
}) {
    const appearance = APPEARANCE[normalizeAccountStatus(status)];
    return (
        <Badge
            variant="outline"
            className={cn("gap-1.5 font-medium", appearance.className, className)}
        >
            <span className={cn("h-1.5 w-1.5 rounded-full", appearance.dot)} />
            {appearance.label}
        </Badge>
    );
}
