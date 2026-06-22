import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptySearchResultsProps {
  searchQuery?: string;
  entityName?: string;
  className?: string;
}

export function EmptySearchResults({
  searchQuery,
  entityName = "results",
  className,
}: EmptySearchResultsProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className
      )}
    >
      <div className="rounded-full bg-muted p-3 mb-4">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">No {entityName} found</h3>
      <p className="text-muted-foreground mt-1 max-w-sm">
        {searchQuery ? (
          <>
            No {entityName} match your search for{" "}
            <span className="font-medium text-foreground">"{searchQuery}"</span>
            . Try a different search term.
          </>
        ) : (
          <>No {entityName} match your current filters. Try adjusting them.</>
        )}
      </p>
    </div>
  );
}

