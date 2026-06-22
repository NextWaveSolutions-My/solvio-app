import Link from "next/link";
import { BookOpen, ArrowRight, FileText } from "lucide-react";
import { getPublishedKBCategories } from "@/actions/knowledge-base";
import { cn } from "@/lib/utils";
import {
  accentClasses,
  accentForSlug,
  iconForSlug,
} from "@/components/knowledge-base/docs-theme";
import { DocsRightRail } from "@/components/knowledge-base/docs-aside";

export const dynamic = "force-dynamic";

export default async function DocsHomePage() {
  const result = await getPublishedKBCategories();
  const categories = result.data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px]">
      {/* Main column */}
      <article className="min-w-0 px-6 py-10 md:px-12 md:py-14">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Documentation
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>Knowledge base</span>
        </div>

        {/* Title */}
        <h1 className="mt-4 flex items-center gap-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          <span className="text-primary">
            <BookOpen className="size-7" />
          </span>
          Documentation
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Guides, tutorials, and references to help you get the most out of the
          platform — from your first ticket to AI support agents, services, and
          integrations.
        </p>

        {/* Featured / category cards */}
        {categories.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center py-16 text-muted-foreground">
            <BookOpen className="mb-4 size-12 opacity-30" />
            <p className="text-lg font-medium">No documentation available yet</p>
            <p className="mt-1 text-sm">Check back soon.</p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {categories.map((category) => {
              const accent = accentClasses[accentForSlug(category.slug)];
              const Icon = iconForSlug(category.slug);
              return (
                <Link
                  key={category.slug}
                  href={`/docs/${category.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg"
                >
                  {/* Gradient header */}
                  <div
                    className={cn(
                      "relative h-40 overflow-hidden bg-gradient-to-br",
                      accent.gradient
                    )}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/30 blur-2xl dark:bg-white/5"
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -bottom-12 -left-8 size-32 rounded-full bg-white/40 blur-2xl dark:bg-white/5"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative flex size-20 items-center justify-center rounded-2xl bg-background/70 shadow-lg shadow-black/5 ring-1 ring-border/60 backdrop-blur-sm transition-transform group-hover:scale-105">
                        {category.icon ? (
                          <span className="text-3xl leading-none">
                            {category.icon}
                          </span>
                        ) : (
                          <span className={accent.text}>
                            <Icon className="size-8" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-base font-semibold text-foreground">
                      {category.title}
                    </h3>
                    {category.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                        {category.description}
                      </p>
                    )}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors group-hover:text-primary">
                      <FileText className="size-3.5" />
                      {category.articleCount} article
                      {category.articleCount !== 1 ? "s" : ""}
                      <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <span>Last updated {new Date().getFullYear()}</span>
          <Link
            href="/#contact"
            className="inline-flex items-center gap-1 font-medium hover:text-foreground"
          >
            Need help? Contact support
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </article>

      {/* Right rail */}
      <DocsRightRail />
    </div>
  );
}
