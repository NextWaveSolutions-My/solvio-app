"use client";

import type { ReactNode } from "react";

import { SearchInput } from "@/components/shared/search-input";
import { PriorityFilter } from "@/components/shared/priority-filter";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export interface PageTabItem {
  value: string;
  label: string;
  count?: number;
}

export interface PageTabsHeaderProps {
  tabs: PageTabItem[];
  /** Show built-in search input on the right */
  showSearch?: boolean;
  /** Placeholder for the search input */
  searchPlaceholder?: string;
  /** Default value for the search input */
  searchDefaultValue?: string;
  /** Show priority filter dropdown */
  showPriorityFilter?: boolean;
  /** Default value for priority filter */
  priorityDefaultValue?: string;
  /** Optional right-side actions (e.g. view toggle, buttons) */
  rightActions?: ReactNode;
  /** Custom class for outer header container */
  className?: string;
  /** Extra class for TabsList */
  tabsListClassName?: string;
  /** Extra class for each TabsTrigger */
  tabsTriggerClassName?: string;
}

const baseTriggerClasses =
  "group relative bg-transparent border-0 rounded-none px-0 pb-3 pt-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none text-sm text-muted-foreground data-[state=active]:text-primary font-medium transition-colors after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity";

export function PageTabsHeader({
  tabs,
  showSearch = false,
  searchPlaceholder = "Search...",
  searchDefaultValue,
  showPriorityFilter = false,
  priorityDefaultValue,
  rightActions,
  className,
  tabsListClassName,
  tabsTriggerClassName,
}: PageTabsHeaderProps) {
  const hasRightSection = showSearch || showPriorityFilter || rightActions;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      {/* Scrollable tabs on small screens */}
      <div className="w-full overflow-x-auto">
        <TabsList
          className={cn(
            "bg-transparent h-auto gap-6 rounded-none justify-start border-0 flex-nowrap min-w-max",
            tabsListClassName
          )}
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(baseTriggerClasses, tabsTriggerClassName)}
            >
              {tab.label}
              {typeof tab.count === "number" && (
                <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary font-semibold transition-colors">
                  {tab.count}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {hasRightSection && (
        <div className="flex w-full flex-col gap-2 pb-3 sm:flex-row sm:items-center md:w-auto md:pb-0">
          {showSearch && (
            <SearchInput
              placeholder={searchPlaceholder}
              defaultValue={searchDefaultValue}
              className="w-full sm:w-auto"
            />
          )}

          {showPriorityFilter && (
            <PriorityFilter
              defaultValue={priorityDefaultValue}
              className="w-full sm:w-[140px]"
            />
          )}

          {rightActions ? <div className="w-full sm:w-auto">{rightActions}</div> : null}
        </div>
      )}
    </div>
  );
}
