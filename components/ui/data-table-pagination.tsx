"use client";

import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps {
    page: number;
    pageSize: number;
    totalItems: number;
    startItem: number;
    endItem: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageSizeOptions?: readonly number[];
    resultsLabel?: string;
    className?: string;
}

function buildPageItems(currentPage: number, totalPages: number) {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set([1, totalPages, currentPage]);

    if (currentPage <= 2) {
        pages.add(2);
        pages.add(3);
    } else if (currentPage >= totalPages - 1) {
        pages.add(totalPages - 1);
        pages.add(totalPages - 2);
    } else {
        pages.add(currentPage - 1);
        pages.add(currentPage + 1);
    }

    const sortedPages = Array.from(pages)
        .filter((pageNumber) => pageNumber >= 1 && pageNumber <= totalPages)
        .sort((a, b) => a - b);

    const pageItems: Array<number | "ellipsis"> = [];

    sortedPages.forEach((pageNumber, index) => {
        const previousPage = sortedPages[index - 1];

        if (previousPage && pageNumber - previousPage > 1) {
            pageItems.push("ellipsis");
        }

        pageItems.push(pageNumber);
    });

    return pageItems;
}

export function DataTablePagination({
    page,
    pageSize,
    totalItems,
    startItem,
    endItem,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 20, 50],
    resultsLabel = "results",
    className,
}: DataTablePaginationProps) {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const pageItems = buildPageItems(page, totalPages);

    return (
        <div
            className={cn(
                "flex flex-col gap-4 border-t border-border/60 bg-background/80 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between",
                className
            )}
        >
            <p className="text-sm text-muted-foreground">
                Showing {startItem} to {endItem} of {totalItems} {resultsLabel}
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Rows per page</span>
                    <Select
                        value={String(pageSize)}
                        onValueChange={(value) => onPageSizeChange(Number(value))}
                    >
                        <SelectTrigger className="h-8 min-w-14 rounded-md bg-background px-2.5">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {pageSizeOptions.map((option) => (
                                <SelectItem key={option} value={String(option)}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-md"
                        onClick={() => onPageChange(1)}
                        disabled={page === 1}
                        aria-label="Go to first page"
                    >
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-md"
                        onClick={() => onPageChange(page - 1)}
                        disabled={page === 1}
                        aria-label="Go to previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {pageItems.map((item, index) =>
                        item === "ellipsis" ? (
                            <span
                                key={`ellipsis-${index}`}
                                className="flex h-8 w-8 items-center justify-center text-muted-foreground"
                                aria-hidden="true"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </span>
                        ) : (
                            <Button
                                key={item}
                                type="button"
                                variant={item === page ? "default" : "outline"}
                                size="icon-sm"
                                className="rounded-md"
                                onClick={() => onPageChange(item)}
                                aria-current={item === page ? "page" : undefined}
                                aria-label={`Go to page ${item}`}
                            >
                                {item}
                            </Button>
                        )
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-md"
                        onClick={() => onPageChange(page + 1)}
                        disabled={page === totalPages}
                        aria-label="Go to next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-md"
                        onClick={() => onPageChange(totalPages)}
                        disabled={page === totalPages}
                        aria-label="Go to last page"
                    >
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
