import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, FilePlus } from "lucide-react";
import { getKBCategoryAdmin } from "@/actions/knowledge-base";
import { ArticleForm } from "@/components/knowledge-base/article-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ categoryId: string }>;
}

export default async function NewArticlePage({ params }: PageProps) {
  const { categoryId } = await params;

  const categoryResult = await getKBCategoryAdmin(categoryId);
  if (!categoryResult.success || !categoryResult.data) {
    notFound();
  }

  const category = categoryResult.data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
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
        <span className="text-foreground font-medium">New Article</span>
      </nav>

      {/* Form card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FilePlus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">New Article</p>
            <p className="text-xs text-muted-foreground">
              Adding to{" "}
              <span className="font-medium text-foreground">
                {category.title}
              </span>
            </p>
          </div>
        </div>
        <div className="p-5">
          <ArticleForm categoryId={categoryId} categorySlug={category.slug} />
        </div>
      </div>
    </div>
  );
}
