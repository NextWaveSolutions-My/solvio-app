"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown, Compass } from "lucide-react";
import type { KBCategory, KBArticle } from "@/types";
import { accentClasses, accentForSlug, iconForSlug } from "./docs-theme";

interface DocsSidebarProps {
  categories: Array<KBCategory & { articleCount: number }>;
  articles: KBArticle[];
  /** Optional search query that filters categories & articles. */
  query?: string;
  onNavigate?: () => void;
}

export function DocsSidebar({
  categories,
  articles,
  query = "",
  onNavigate,
}: DocsSidebarProps) {
  const pathname = usePathname();
  const q = query.trim().toLowerCase();

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const toggle = (slug: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  // Build the filtered category/article tree based on the search query.
  const groups = useMemo(() => {
    return categories
      .map((category) => {
        const categoryArticles = articles.filter(
          (a) => a.categorySlug === category.slug
        );
        if (!q) return { category, articles: categoryArticles, matched: false };

        const categoryMatches = category.title.toLowerCase().includes(q);
        const matching = categoryMatches
          ? categoryArticles
          : categoryArticles.filter(
              (a) =>
                a.title.toLowerCase().includes(q) ||
                (a.excerpt ?? "").toLowerCase().includes(q)
            );
        return { category, articles: matching, matched: categoryMatches };
      })
      .filter((g) => q === "" || g.matched || g.articles.length > 0);
  }, [categories, articles, q]);

  const isOverview = pathname === "/docs";

  return (
    <nav className="py-6 px-3">
      {/* Overview */}
      <Link
        href="/docs"
        onClick={onNavigate}
        className={cn(
          "mb-6 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
          isOverview
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center",
            isOverview ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Compass className="size-3.5" />
        </span>
        Overview
      </Link>

      {groups.length === 0 && (
        <p className="px-2 text-xs text-muted-foreground">
          No matches for &ldquo;{query}&rdquo;
        </p>
      )}

      {groups.map(({ category, articles: groupArticles }) => {
        const accent = accentClasses[accentForSlug(category.slug)];
        const Icon = iconForSlug(category.slug);
        // When searching, force every matching group open.
        const open = q ? true : !collapsed.has(category.slug);

        return (
          <div key={category.slug} className="mb-6">
            <button
              type="button"
              onClick={() => toggle(category.slug)}
              className="group mb-2 flex w-full items-center justify-between gap-2 overflow-hidden px-2"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className={cn("shrink-0", accent.text)}>
                  {category.icon ? (
                    <span className="text-sm leading-none">{category.icon}</span>
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </span>
                <span className="block truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                  {category.title}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200",
                  !open && "-rotate-90"
                )}
              />
            </button>

            {open && (
              <ul className="space-y-0.5">
                {groupArticles.length === 0 ? (
                  <li className="px-2 py-1.5 text-xs text-muted-foreground/50 italic">
                    No articles yet
                  </li>
                ) : (
                  groupArticles.map((article) => {
                    const href = `/docs/${category.slug}/${article.slug}`;
                    const isActive = pathname === href;
                    return (
                      <li key={article.slug}>
                        <Link
                          href={href}
                          onClick={onNavigate}
                          className={cn(
                            "group flex items-center gap-2.5 overflow-hidden rounded-lg px-2 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full transition-colors",
                              isActive
                                ? "bg-primary"
                                : "bg-border group-hover:bg-foreground/30"
                            )}
                          />
                          <span className="truncate">{article.title}</span>
                        </Link>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
