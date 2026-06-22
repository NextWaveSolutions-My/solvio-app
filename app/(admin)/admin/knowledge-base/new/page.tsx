import Link from "next/link";
import { ChevronRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/knowledge-base/category-form";

export default function NewCategoryPage() {
  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/admin/knowledge-base"
          className="hover:text-foreground transition-colors"
        >
          Knowledge Base
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">New Category</span>
      </nav>

      {/* Form card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">New Category</p>
            <p className="text-xs text-muted-foreground">
              Create a new documentation category
            </p>
          </div>
        </div>
        <div className="p-5">
          <CategoryForm />
        </div>
      </div>
    </div>
  );
}
