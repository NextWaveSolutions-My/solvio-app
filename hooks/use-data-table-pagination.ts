"use client";

import { useState } from "react";

export const DEFAULT_DATA_TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

interface UseDataTablePaginationOptions {
    initialPageSize?: number;
    pageSizeOptions?: readonly number[];
}

export function useDataTablePagination<T>(
    items: T[],
    options: UseDataTablePaginationOptions = {}
) {
    const pageSizeOptions =
        options.pageSizeOptions ?? DEFAULT_DATA_TABLE_PAGE_SIZE_OPTIONS;
    const initialPageSize =
        options.initialPageSize ?? pageSizeOptions[0] ?? 10;

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const currentPage = Math.min(page, totalPages);
    const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedItems = items.slice(startIndex, endIndex);
    const startItem = totalItems === 0 ? 0 : startIndex + 1;
    const endItem = endIndex;

    const goToPage = (nextPage: number) => {
        setPage(Math.min(Math.max(nextPage, 1), totalPages));
    };

    const updatePageSize = (nextPageSize: number) => {
        setPageSize(nextPageSize);
        setPage(1);
    };

    return {
        page: currentPage,
        pageSize,
        pageSizeOptions,
        totalItems,
        totalPages,
        paginatedItems,
        startItem,
        endItem,
        goToPage,
        updatePageSize,
    };
}
