import { toPlainObject } from "@/lib/serialization";
import { PublicHeader } from "@/components/layout/public-header";
import { DocsShell } from "@/components/knowledge-base/docs-shell";
import { DocsThemeToggle } from "@/components/knowledge-base/docs-theme-toggle";
import {
  getPublishedKBCategories,
  getAllPublishedArticlesForNav,
} from "@/actions/knowledge-base";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categoriesResult, articlesResult] = await Promise.all([
    getPublishedKBCategories(),
    getAllPublishedArticlesForNav(),
  ]);

  // Ensure values passed into client components are plain serializable objects.
  const categories = toPlainObject(categoriesResult.data ?? []);
  const articles = toPlainObject(articlesResult.data ?? []);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Marketing navbar */}
      <PublicHeader />

      {/* Docs sub-header + 3-column layout (sidebar fed by live KB data) */}
      <DocsShell categories={categories} articles={articles}>
        {children}
      </DocsShell>

      {/* Floating theme toggle */}
      <DocsThemeToggle />
    </div>
  );
}
