import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ExternalLink, FileEdit } from "lucide-react";
import { ArticleForm } from "@/components/knowledge-base/article-form";
import { getKBCategoryAdmin, getKBArticleAdmin } from "@/actions/knowledge-base";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ categoryId: string; articleId: string }>;
}

export default async function EditArticlePage({ params }: PageProps) {
  const { categoryId, articleId } = await params;

  const [categoryResult, articleResult] = await Promise.all([
    getKBCategoryAdmin(categoryId),
    getKBArticleAdmin(articleId),
  ]);

  if (
    !categoryResult.success ||
    !categoryResult.data ||
    !articleResult.success ||
    !articleResult.data
  ) {
    notFound();
  }

  const category = categoryResult.data;
  const article = articleResult.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
          <Link
            href="/admin/knowledge-base"
            className="hover:text-foreground transition-colors"
          >
            Knowledge Base
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href={`/admin/knowledge-base/${categoryId}`}
            className="hover:text-foreground transition-colors"
          >
            {category.title}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium truncate max-w-48">
            {article.title}
          </span>
        </nav>
        {article.isPublished && (
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/docs/${category.slug}/${article.slug}`}
              target="_blank"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View in Docs
            </Link>
          </Button>
        )}
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileEdit className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{article.title}</p>
              <p className="text-xs text-muted-foreground">
                In{" "}
                <span className="font-medium text-foreground">
                  {category.title}
                </span>
              </p>
            </div>
          </div>
          <Badge
            variant={article.isPublished ? "default" : "secondary"}
            className="shrink-0 text-[11px]"
          >
            {article.isPublished ? "Live" : "Draft"}
          </Badge>
        </div>
        <div className="p-5">
          <ArticleForm
            categoryId={categoryId}
            categorySlug={category.slug}
            article={article}
          />
        </div>
      </div>
    </div>
  );
}
