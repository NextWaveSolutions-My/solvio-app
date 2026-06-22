import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight,
  Plus,
  Edit,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/knowledge-base/category-form";
import { DeleteArticleButton } from "@/components/knowledge-base/delete-article-button";
import { getKBCategoryAdmin, getKBArticlesAdmin } from "@/actions/knowledge-base";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ categoryId: string }>;
}

export default async function CategoryDetailPage({ params }: PageProps) {
  const { categoryId } = await params;

  const [categoryResult, articlesResult] = await Promise.all([
    getKBCategoryAdmin(categoryId),
    getKBArticlesAdmin(categoryId),
  ]);

  if (!categoryResult.success || !categoryResult.data) {
    notFound();
  }

  const category = categoryResult.data;
  const articles = articlesResult.data ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/admin/knowledge-base"
            className="hover:text-foreground transition-colors"
          >
            Knowledge Base
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-48">
            {category.title}
          </span>
        </nav>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/docs/${category.slug}`} target="_blank">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            View in Docs
          </Link>
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Left: Category settings ─────────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
              <div className="w-9 h-9 rounded-lg bg-background flex items-center justify-center text-xl leading-none shrink-0 border border-border">
                {category.icon || "📄"}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{category.title}</p>
                <p className="text-xs text-muted-foreground">Category settings</p>
              </div>
            </div>
            <div className="p-5">
              <CategoryForm category={category as any} />
            </div>
          </div>
        </div>

        {/* ── Right: Articles list ─────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Articles</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {articles.length}{" "}
                {articles.length !== 1 ? "articles" : "article"} in this
                category
              </p>
            </div>
            <Button asChild size="sm">
              <Link href={`/admin/knowledge-base/${categoryId}/new`}>
                <Plus className="h-4 w-4 mr-1.5" />
                New Article
              </Link>
            </Button>
          </div>

          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 py-14 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <BookOpen className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium">No articles yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Add your first article to this category.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/knowledge-base/${categoryId}/new`}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add First Article
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="divide-y divide-border">
                {articles.map((article) => (
                  <div
                    key={article._id.toString()}
                    className="group flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {article.title}
                          </span>
                          <Badge
                            variant={
                              article.isPublished ? "default" : "secondary"
                            }
                            className="text-[11px] gap-1 shrink-0"
                          >
                            {article.isPublished ? (
                              <Eye className="h-2.5 w-2.5" />
                            ) : (
                              <EyeOff className="h-2.5 w-2.5" />
                            )}
                            {article.isPublished ? "Live" : "Draft"}
                          </Badge>
                        </div>
                        {article.excerpt && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {article.excerpt}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-3 shrink-0">
                      <span className="text-xs text-muted-foreground mr-1 hidden sm:block">
                        #{article.sortOrder}
                      </span>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Link
                          href={`/admin/knowledge-base/${categoryId}/${article._id.toString()}`}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <DeleteArticleButton
                        id={article._id.toString()}
                        title={article.title}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
