"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SearchInputProps {
  /** Placeholder text for the input */
  placeholder?: string;
  /** Default value for the search input */
  defaultValue?: string;
  /** URL param name for search (default: "search") */
  paramName?: string;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Additional class name */
  className?: string;
  /** Input class name */
  inputClassName?: string;
}

export function SearchInput({
  placeholder = "Search...",
  defaultValue = "",
  paramName = "search",
  debounceMs = 300,
  className,
  inputClassName,
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get current search value from URL or use default
  const currentSearch = searchParams.get(paramName) || defaultValue;
  const [value, setValue] = useState(currentSearch);

  // Sync value with URL when it changes externally
  useEffect(() => {
    setValue(searchParams.get(paramName) || "");
  }, [searchParams, paramName]);

  // Debounced search update
  const updateSearch = useCallback(
    (searchValue: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (searchValue.trim()) {
        params.set(paramName, searchValue.trim());
      } else {
        params.delete(paramName);
      }

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [router, pathname, searchParams, paramName]
  );

  // Handle input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (value !== currentSearch) {
        updateSearch(value);
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [value, currentSearch, debounceMs, updateSearch]);

  // Handle clear button
  const handleClear = () => {
    setValue("");
    updateSearch("");
  };

  return (
    <div className={cn("relative flex-1 md:flex-none", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          "pl-10 pr-8 h-9 w-full md:w-[220px] border-border/60 bg-background text-sm",
          inputClassName
        )}
      />
      {isPending ? (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
      ) : value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-transparent"
          onClick={handleClear}
        >
          <X className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="sr-only">Clear search</span>
        </Button>
      ) : null}
    </div>
  );
}

