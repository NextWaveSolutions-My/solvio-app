"use client";

import type { LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewModeToggleOption = {
  value: string;
  label?: string;
  icon?: LucideIcon;
};

export interface ViewModeToggleProps {
  /** Name of the query param used to store the mode (defaults to `view`) */
  paramName?: string;
  /** Default mode when the query param is not present (defaults to first mode or `table`) */
  defaultMode?: string;
  /** List of selectable modes. If omitted, a simple two-state toggle is rendered. */
  modes?: ViewModeToggleOption[];
  /** Extra classes for the root container */
  className?: string;
  /** Extra classes for each button */
  buttonClassName?: string;
}

const fallbackModes: ViewModeToggleOption[] = [
  { value: "table", label: "Table" },
  { value: "card", label: "Cards" },
];

export function ViewModeToggle({
  paramName = "view",
  defaultMode,
  modes,
  className,
  buttonClassName,
}: ViewModeToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const modeOptions = modes && modes.length > 0 ? modes : fallbackModes;

  const current =
    searchParams.get(paramName) ||
    defaultMode ||
    modeOptions[0]?.value ||
    "table";

  const setMode = (mode: string) => {
    if (!mode || mode === current) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, mode);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 border border-border/40 rounded-lg p-1 bg-muted/20",
        className,
      )}
    >
      {modeOptions.map((mode) => {
        const isActive = current === mode.value;
        const Icon = mode.icon;

        return (
          <Button
            key={mode.value}
            variant={isActive ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode(mode.value)}
            className={cn("h-8 px-3", buttonClassName)}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {mode.label && (
              <span className="ml-2 hidden sm:inline">{mode.label}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
}

