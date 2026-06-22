import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ArrowRight } from "lucide-react";
import {
  getPublishedKBCategories,
  getPublishedKBArticles,
} from "@/actions/knowledge-base";
import { cn } from "@/lib/utils";
import {
  accentClasses,
  accentForSlug,
  iconForSlug,
} from "@/components/knowledge-base/docs-theme";
import { DocsRightRail } from "@/components/knowledge-base/docs-aside";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ categorySlug: string }>;
}

export default async function CategoryPage({ params }: PageProps) {
  const { categorySlug } = await params;

  const [categoriesResult, articlesResult] = await Promise.all([
    getPublishedKBCategories(),
    getPublishedKBArticles(categorySlug),
  ]);

  const category = categoriesResult.data?.find((c) => c.slug === categorySlug);
  if (!category) notFound();

  const articles = articlesResult.data ?? [];
  const accent = accentClasses[accentForSlug(category.slug)];
  const Icon = iconForSlug(category.slug);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px]">
      <article className="min-w-0 px-6 py-10 md:px-12 md:py-14">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <ChevronRight className="size-3 text-muted-foreground/40" />
          <span className="text-foreground">{category.title}</span>
        </nav>

        {/* Header */}
        <div className="mt-6 flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
              accent.bg
            )}
          >
            {category.icon ? (
              <span className="text-lg leading-none">{category.icon}</span>
            ) : (
              <Icon className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Category</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {category.title}
            </h1>
          </div>
        </div>

        {category.description && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {category.description}
          </p>
        )}

        {/* Articles */}
        {articles.length === 0 ? (
          <p className="mt-10 text-muted-foreground">
            No articles in this category yet.
          </p>
        ) : (
          <ol className="mt-10 space-y-3">
            {articles.map((article, i) => (
              <li key={article.slug}>
                <Link
                  href={`/docs/${categorySlug}/${article.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm md:p-5"
                >
                  <div
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm",
                      accent.bg
                    )}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary md:text-base">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-0.5 line-clamp-1 text-sm leading-relaxed text-muted-foreground">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </article>

      <DocsRightRail />
    </div>
  );
}
