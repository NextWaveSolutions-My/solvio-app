"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Generic row-selection state for the data tables. Tracks selected row ids in a
 * Set and derives the header checkbox state. Selection is intersected with the
 * current items, so ids for rows that disappear (e.g. after a refresh or filter
 * change) are dropped from the reported selection automatically.
 *
 * `getId` should be stable (declare it with useCallback in the caller, or use a
 * plain top-level function) to avoid needless recomputation.
 */
export function useTableSelection<T>(items: T[], getId: (item: T) => string) {
    const [rawSelected, setRawSelected] = useState<Set<string>>(new Set());

    const allIds = useMemo(() => items.map(getId), [items, getId]);

    // Only count ids that still exist in the current item list.
    const selectedIds = useMemo(() => {
        const present = new Set(allIds);
        const next = new Set<string>();
        for (const id of rawSelected) {
            if (present.has(id)) next.add(id);
        }
        return next;
    }, [allIds, rawSelected]);

    const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);
    const selectedCount = selectedIds.size;
    const isAllSelected =
        allIds.length > 0 && selectedCount === allIds.length;
    const isSomeSelected = selectedCount > 0 && !isAllSelected;
    /** Value for a tri-state header checkbox. */
    const headerCheckedState: boolean | "indeterminate" = isAllSelected
        ? true
        : isSomeSelected
            ? "indeterminate"
            : false;

    const isSelected = useCallback(
        (id: string) => selectedIds.has(id),
        [selectedIds],
    );

    const toggle = useCallback((id: string) => {
        setRawSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        setRawSelected((prev) => {
            const present = new Set(allIds);
            const selectedHere = Array.from(prev).filter((id) =>
                present.has(id),
            );
            // If every current row is already selected, clear; otherwise select all.
            if (selectedHere.length === allIds.length) return new Set();
            return new Set(allIds);
        });
    }, [allIds]);

    const clear = useCallback(() => setRawSelected(new Set()), []);

    return {
        selectedIds,
        selectedIdList,
        selectedCount,
        isAllSelected,
        isSomeSelected,
        headerCheckedState,
        isSelected,
        toggle,
        toggleAll,
        clear,
    };
}
