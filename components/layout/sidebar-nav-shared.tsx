"use client";

// Shared sidebar navigation styling + submenu chain used by the admin,
// support-agent, and customer (dashboard) navs so all three stay visually
// identical. Edit here to update every panel at once.

export const expandedNavItemClasses =
  "group relative flex min-h-[38px] items-center gap-3 overflow-hidden rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200";
export const expandedChildNavItemClasses =
  "group relative flex min-h-[34px] items-center rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200";
export const expandedNavTriggerClasses =
  "group relative flex min-h-10 w-full items-center justify-between gap-3 overflow-hidden rounded-[10px] px-3 py-2 text-sm font-medium transition-all duration-200";
export const activeMenuItemClasses =
  "bg-[color-mix(in_oklab,var(--primary)_10%,white)] font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground";
export const activeExpandedItemClasses = activeMenuItemClasses;
export const activeExpandedParentItemClasses = activeMenuItemClasses;
export const activeExpandedChildItemClasses =
  "bg-[color-mix(in_oklab,var(--primary)_6%,white)] font-medium text-primary dark:bg-primary/12 dark:text-primary-foreground";
export const inactiveExpandedItemClasses =
  "text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-50";
export const inactiveExpandedChildItemClasses =
  "text-[#64748b] hover:bg-[#f6f8fb] hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100";
export const collapsedNavItemClasses =
  "group relative flex min-h-[3.125rem] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg px-1.5 py-1.5 text-center transition-all duration-200";
export const activeCollapsedItemClasses = activeMenuItemClasses;
export const inactiveCollapsedItemClasses =
  "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100";
export const activeIconClasses = "text-primary dark:text-primary-foreground";
export const inactiveIconClasses =
  "text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-100";

const submenuRowHeight = 34;
const submenuRowGap = 4;
const submenuPaddingY = 2;
const submenuBranchWidth = 20;
const submenuElbowRadius = 10;
const submenuChainStrokeWidth = 2;

export function SubmenuChain({ count }: { count: number }) {
  const height =
    count * submenuRowHeight + Math.max(0, count - 1) * submenuRowGap + submenuPaddingY * 2;
  const centers = Array.from(
    { length: count },
    (_, index) =>
      submenuPaddingY +
      submenuRowHeight / 2 +
      index * (submenuRowHeight + submenuRowGap)
  );
  const lastCenter = centers[centers.length - 1] ?? 0;
  const chainPath = [
    `M 0 0 V ${Math.max(0, lastCenter - submenuElbowRadius)}`,
    ...centers.map(
      (center) =>
        `M 0 ${Math.max(0, center - submenuElbowRadius)} Q 0 ${center} ${submenuElbowRadius} ${center} H ${submenuBranchWidth}`
    ),
  ].join(" ");

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 text-[#e6ebf2] dark:text-white/10"
      fill="none"
      height={height}
      viewBox={`0 0 ${submenuBranchWidth} ${height}`}
      width={submenuBranchWidth}
    >
      <path
        d={chainPath}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={submenuChainStrokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
