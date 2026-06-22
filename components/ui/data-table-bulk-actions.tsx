"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface DataTableBulkActionsProps {
    /** Number of currently selected rows. The bar hides itself when this is 0. */
    selectedCount: number;
    /** Singular noun for the selected rows, e.g. "member", "customer", "ticket". */
    itemLabel?: string;
    /** Clears the current selection. */
    onClear: () => void;
    /** Action controls (buttons / dropdowns) rendered on the right. */
    children?: ReactNode;
    className?: string;
}

/**
 * Toolbar shown above a data table when one or more rows are selected. The
 * per-table actions are passed in as children so each table can offer the
 * actions that make sense for its data.
 */
export function DataTableBulkActions({
    selectedCount,
    itemLabel = "item",
    onClear,
    children,
    className,
}: DataTableBulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div
            className={cn(
                "mb-3 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                className,
            )}
        >
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-foreground">
                    {selectedCount} {itemLabel}
                    {selectedCount === 1 ? "" : "s"} selected
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                >
                    <X className="mr-1 h-3.5 w-3.5" />
                    Clear
                </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">{children}</div>
        </div>
    );
}
