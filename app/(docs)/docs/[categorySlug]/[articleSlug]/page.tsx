import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import {
  getPublishedKBArticle,
  getPublishedKBCategories,
  getAllPublishedArticlesForNav,
} from "@/actions/knowledge-base";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  ArticleToc,
  type TocHeading,
} from "@/components/knowledge-base/article-toc";
import {
  DocsFeedback,
  DocsHelpCard,
} from "@/components/knowledge-base/docs-aside";
import {
  accentClasses,
  accentForSlug,
  iconForSlug,
} from "@/components/knowledge-base/docs-theme";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ categorySlug: string; articleSlug: string }>;
}

// ── Server-side: add IDs to h2/h3 headings and extract TOC ───────────────────

function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function processContent(html: string): {
  content: string;
  headings: TocHeading[];
} {
  const headings: TocHeading[] = [];
  const idCount: Record<string, number> = {};

  const content = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,
    (_match, level, attrs, inner) => {
      const text = inner.replace(/<[^>]*>/g, "").trim();
      let id = slugifyHeading(text);
      if (!id) id = `heading-${headings.length}`;
      if (idCount[id] !== undefined) {
        idCount[id]++;
        id = `${id}-${idCount[id]}`;
      } else {
        idCount[id] = 0;
      }
      headings.push({ id, text, level: parseInt(level) });
      return `<h${level}${attrs} id="${id}">${inner}</h${level}>`;
    }
  );

  return { content, headings };
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function ArticlePage({ params }: PageProps) {
  const { categorySlug, articleSlug } = await params;

  const [articleResult, categoriesResult, allArticlesResult] =
    await Promise.all([
      getPublishedKBArticle(categorySlug, articleSlug),
      getPublishedKBCategories(),
      getAllPublishedArticlesForNav(),
    ]);

  if (!articleResult.success || !articleResult.data) notFound();

  const article = articleResult.data;
  const category = categoriesResult.data?.find((c) => c.slug === categorySlug);
  const { content, headings } = processContent(article.content);

  const accent = accentClasses[accentForSlug(category?.slug ?? categorySlug)];
  const Icon = iconForSlug(category?.slug ?? categorySlug);

  // Prev / Next within the same category
  const categoryArticles = (allArticlesResult.data ?? []).filter(
    (a) => a.categorySlug === categorySlug
  );
  const currentIndex = categoryArticles.findIndex(
    (a) => a.slug === articleSlug
  );
  const prevArticle = currentIndex > 0 ? categoryArticles[currentIndex - 1] : null;
  const nextArticle =
    currentIndex < categoryArticles.length - 1
      ? categoryArticles[currentIndex + 1]
      : null;
  const chapterNo = String(currentIndex >= 0 ? currentIndex + 1 : 1).padStart(
    2,
    "0"
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_240px]">
      {/* Main article content */}
      <article className="min-w-0 px-6 py-10 md:px-12 md:py-14">
        {/* Breadcrumb */}
        <nav
          className="flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link href="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
          {category && (
            <>
              <Link
                href={`/docs/${categorySlug}`}
                className="hover:text-foreground transition-colors"
              >
                {category.title}
              </Link>
              <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
            </>
          )}
          <span className="max-w-50 truncate text-foreground">
            {article.title}
          </span>
        </nav>

        {/* Header */}
        <div className="mt-6 flex items-start gap-3">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
              accent.bg
            )}
          >
            {category?.icon ? (
              <span className="text-lg leading-none">{category.icon}</span>
            ) : (
              <Icon className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              Chapter {chapterNo}
              {category ? ` · ${category.title}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {article.title}
            </h1>
          </div>
        </div>

        {article.excerpt && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {article.excerpt}
          </p>
        )}

        {/* Meta bar */}
        <div className="mt-6 mb-10 flex items-center gap-2 border-b border-border pb-8 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2.5 py-1">
            <Calendar className="size-3.5 shrink-0" />
            Last updated {format(new Date(article.updatedAt), "MMM d, yyyy")}
          </span>
        </div>

        {/* Article HTML content */}
        <div
          className="prose prose-sm md:prose-base max-w-none dark:prose-invert
            prose-headings:font-semibold prose-headings:tracking-tight prose-headings:scroll-mt-48
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
            prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
            prose-p:leading-7 prose-p:text-foreground/90
            prose-a:text-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline
            prose-strong:text-foreground prose-strong:font-semibold
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
            prose-code:text-[13px] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl prose-pre:shadow-sm
            prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:rounded-r-lg prose-blockquote:py-0.5 prose-blockquote:text-muted-foreground prose-blockquote:not-italic
            prose-ul:my-4 prose-li:my-1
            prose-img:rounded-xl prose-img:border prose-img:border-border prose-img:shadow-sm"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Prev / Next navigation */}
        {(prevArticle || nextArticle) && (
          <div className="mt-14 grid grid-cols-2 gap-4 border-t border-border pt-6">
            <div>
              {prevArticle && (
                <Link
                  href={`/docs/${categorySlug}/${prevArticle.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm"
                >
                  <ArrowLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-foreground" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Previous
                    </p>
                    <p className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      {prevArticle.title}
                    </p>
                  </div>
                </Link>
              )}
            </div>
            <div>
              {nextArticle && (
                <Link
                  href={`/docs/${categorySlug}/${nextArticle.slug}`}
                  className="group flex items-center justify-end gap-3 rounded-xl border border-border bg-card p-4 text-right transition-all hover:border-foreground/20 hover:shadow-sm"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Next
                    </p>
                    <p className="line-clamp-2 text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      {nextArticle.title}
                    </p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </Link>
              )}
            </div>
          </div>
        )}
      </article>

      {/* Right rail: TOC + feedback + help */}
      <aside className="hidden lg:block">
        <div className="sticky top-48 space-y-10 px-6 py-10">
          {headings.length > 0 && <ArticleToc headings={headings} />}
          <DocsFeedback />
          <DocsHelpCard />
        </div>
      </aside>
    </div>
  );
}
