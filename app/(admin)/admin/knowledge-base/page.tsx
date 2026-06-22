import {
  Plus,
  FileText,
  Eye,
  EyeOff,
  Settings2,
  FolderOpen,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatsGrid } from "@/components/shared/stats-grid";
import { getAllKBCategoriesAdmin } from "@/actions/knowledge-base";
import { DeleteCategoryButton } from "@/components/knowledge-base/delete-category-button";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
  const result = await getAllKBCategoriesAdmin();
  const categories = result.data ?? [];

  const totalArticles = categories.reduce((sum, c) => sum + c.articleCount, 0);
  const publishedCategories = categories.filter((c) => c.isPublished).length;

  const statsData = [
    {
      title: "Total Categories",
      value: categories.length,
      icon: FolderOpen,
      iconColor: "text-info",
      iconBgColor: "bg-info/15",
      description: "Knowledge base sections",
    },
    {
      title: "Published",
      value: publishedCategories,
      icon: CheckCircle2,
      iconColor: "text-success",
      iconBgColor: "bg-success/15",
      description: "Visible to customers",
    },
    {
      title: "Total Articles",
      value: totalArticles,
      icon: FileText,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/15",
      description: "Across all categories",
    },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Knowledge Base</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your documentation — categories, articles, and visibility.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/knowledge-base/new">
            <Plus className="h-4 w-4 mr-2" />
            New Category
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <StatsGrid stats={statsData} />

      {/* Category grid */}
      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-20 text-center">
          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-4">
            <BookOpen className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold">No categories yet</h3>
          <p className="text-muted-foreground text-sm mt-1 mb-5 max-w-xs">
            Create your first category to start building your knowledge base.
          </p>
          <Button asChild>
            <Link href="/admin/knowledge-base/new">
              <Plus className="h-4 w-4 mr-2" />
              New Category
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <div
              key={category._id.toString()}
              className="group flex flex-col p-5 rounded-xl border border-border/60 bg-card transition-all hover:border-border hover:shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/40 bg-muted/30 text-lg shadow-sm">
                  {category.icon || "📄"}
                </div>
                <Badge
                  variant={category.isPublished ? "default" : "secondary"}
                  className="rounded-md font-medium text-[11px] gap-1 shrink-0 px-2 py-0.5"
                >
                  {category.isPublished ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                  {category.isPublished ? "Live" : "Draft"}
                </Badge>
              </div>

              <div className="mb-6 flex-1">
                <h3 className="font-semibold text-foreground leading-none tracking-tight line-clamp-1">
                  {category.title}
                </h3>
                {category.description ? (
                  <p className="mt-2.5 text-sm text-muted-foreground line-clamp-2">
                    {category.description}
                  </p>
                ) : (
                  <p className="mt-2.5 text-sm text-muted-foreground/60 italic">
                    No description provided
                  </p>
                )}
              </div>

              <div className="mt-auto flex flex-col gap-4">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground/80">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span>
                      {category.articleCount}{" "}
                      {category.articleCount === 1 ? "Article" : "Articles"}
                    </span>
                  </div>
                  <span>Order #{category.sortOrder}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="h-9 flex-1 shadow-sm">
                    <Link href={`/admin/knowledge-base/${category._id.toString()}`}>
                      <Settings2 className="mr-1.5 h-3.5 w-3.5" />
                      Manage
                    </Link>
                  </Button>
                  <DeleteCategoryButton
                    id={category._id.toString()}
                    title={category.title}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
