import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KBCategory } from "@/types";

interface KBCategoryCardProps {
  category: KBCategory & { articleCount: number };
  className?: string;
}

export function KBCategoryCard({ category, className }: KBCategoryCardProps) {
  return (
    <Link
      href={`/docs/${category.slug}`}
      className={cn(
        "group block rounded-xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-md transition-all duration-200",
        className
      )}
    >
      <div className="flex items-start gap-4">
        {category.coverImage ? (
          <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-muted">
            <img
              src={category.coverImage}
              alt={category.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
            {category.icon || "📄"}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {category.title}
          </h3>
          {category.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {category.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              {category.articleCount} article
              {category.articleCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Get started
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
