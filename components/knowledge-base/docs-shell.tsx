"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ChevronRight, Sparkles, BookOpen, Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCompanyInfo } from "@/components/providers/settings-provider";
import type { KBCategory, KBArticle } from "@/types";
import { useAiChatConfig } from "@/components/ai-chat/use-ai-chat-config";
import { requestOpenAiChat } from "@/lib/ai/open-ai-chat";
import { DocsSidebar } from "./docs-sidebar";
import { DocsMobileMenu } from "./docs-mobile-menu";

interface DocsShellProps {
  categories: Array<KBCategory & { articleCount: number }>;
  articles: KBArticle[];
  children: React.ReactNode;
}

const tabs: { label: string; href: string; match?: string }[] = [
  { label: "Documentation", href: "/docs", match: "/docs" },
  { label: "Features", href: "/#features" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/#contact" },
];

const docsContainerClass = "container mx-auto max-w-6xl px-4 sm:px-6 lg:px-0";

export function DocsShell({ categories, articles, children }: DocsShellProps) {
  const [query, setQuery] = useState("");
  const pathname = usePathname();
  const { siteName } = useCompanyInfo();
  const aiConfig = useAiChatConfig();
  const showAskAi = aiConfig?.enabled === true;

  return (
    <>
      {/* Docs sub-header — sticky right below the marketing header (h-16). */}
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className={cn(docsContainerClass, "py-4")}>
          <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:gap-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {/* Mobile docs-nav trigger (sidebar is hidden below lg) */}
              <DocsMobileMenu categories={categories} articles={articles} />
              <BookOpen className="hidden size-4 lg:block" />
              <span>Docs</span>
              <ChevronRight className="size-3 text-muted-foreground/40" />
              <span className="text-foreground">Documentation</span>
              <span className="ml-2 hidden rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground md:inline-block">
                v1.0
              </span>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                type="search"
                placeholder="Search the docs — try 'tickets', 'agent', 'setup'..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-full border border-border bg-muted/40 pr-16 pl-10 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-background focus:ring-4 focus:ring-primary/10"
              />
              <kbd className="absolute top-1/2 right-3 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘ K
              </kbd>
            </div>

            {/* Ask AI — only shown when the AI chat widget is enabled in admin */}
            {showAskAi && (
              <button
                type="button"
                onClick={requestOpenAiChat}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <Sparkles className="size-4" />
                Ask AI
              </button>
            )}
          </div>

          {/* Tabs */}
          <nav className="mt-4 -mb-px flex flex-wrap items-center gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => {
              const active = t.match ? pathname.startsWith(t.match) : false;
              return (
                <Link
                  key={t.label}
                  href={t.href}
                  className={cn(
                    "relative inline-flex h-10 items-center gap-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t.label}
                  {active && (
                    <span className="absolute right-3 bottom-0 left-3 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 3-col layout */}
      <div
        className={cn(
          docsContainerClass,
          "grid grid-cols-1 gap-0 lg:grid-cols-[260px_minmax(0,1fr)]"
        )}
      >
        {/* Left sidebar */}
        <aside className="hidden border-r border-border lg:block">
          {/* Pins below the header (4rem) + sub-header (~8rem) = 12rem, which
              also matches the at-rest stack so the footer sits flush. */}
          <div className="sticky top-48 flex h-[calc(100dvh-12rem)] flex-col">
            <div className="scrollbar-thin flex-1 overflow-y-auto">
              <DocsSidebar
                categories={categories}
                articles={articles}
                query={query}
              />
            </div>

            {/* Powered by */}
            <div className="border-t border-border px-5 py-4">
              <Link
                href="/"
                className="flex items-center gap-2.5 rounded-lg p-2 text-sm transition-colors hover:bg-muted"
              >
                <span className="flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-sm">
                  <Compass className="size-3.5" />
                </span>
                <span className="text-xs">
                  <span className="block text-muted-foreground">Powered by</span>
                  <span className="block font-semibold text-foreground">
                    {siteName || "Solvio"}
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content (server-rendered page) */}
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}
