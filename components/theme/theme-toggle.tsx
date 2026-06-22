"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

function subscribe() {
  return () => {};
}

export function ThemeToggle({ withLabel = true }: { withLabel?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    // Compact case renders a circular placeholder so the layout doesn't shift
    // before hydration; labeled case keeps the row placeholder.
    if (!withLabel) {
      return (
        <div className="h-9 w-9 rounded-full border border-border/60 bg-muted/40" />
      );
    }
    return (
      <div className="h-9 w-full flex items-center gap-2 text-sm text-muted-foreground">
        <Sun className="h-4 w-4" />
        <span>Theme</span>
        <div className="ml-auto h-5 w-9 rounded-full bg-muted" />
      </div>
    );
  }

  const isDark = (theme ?? resolvedTheme) === "dark";

  // Compact: single circular icon button (used in the header).
  if (!withLabel) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="h-9 w-9 rounded-full border-border/70 bg-background/40 text-foreground/80 transition-all hover:border-primary/40 hover:bg-muted/50 hover:text-foreground active:scale-[0.95] dark:text-white/85 dark:hover:text-white"
      >
        <Sun className="size-4.5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-4.5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
      </Button>
    );
  }

  // Labeled: switch row (used in the mobile menu / settings contexts).
  return (
    <div className="flex items-center gap-2 text-sm">
      <Sun className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">Theme</span>
      <Switch
        className="ml-auto"
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
      <Moon className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
