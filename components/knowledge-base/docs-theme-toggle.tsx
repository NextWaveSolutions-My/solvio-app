"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Sun, Monitor, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

function subscribe() {
  return () => {};
}

const options = [
  { key: "light", icon: Sun },
  { key: "system", icon: Monitor },
  { key: "dark", icon: Moon },
] as const;

/** Floating bottom-right light/system/dark switcher (Storify-style). */
export function DocsThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );

  const active = mounted ? theme ?? "system" : "system";

  return (
    <div className="fixed left-6 bottom-6 z-40 hidden items-center gap-1 rounded-full border border-border bg-background p-1 shadow-lg shadow-black/5 lg:flex">
      {options.map((opt) => {
        const isActive = active === opt.key;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => setTheme(opt.key)}
            aria-label={`${opt.key} theme`}
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
