import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

import { StatsCard } from "@/components/admin/stats-card";
import { cn } from "@/lib/utils";

export interface StatConfig {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface StatsGridProps {
  stats: StatConfig[];
  /** Optional extra classes to adjust grid layout / spacing */
  className?: string;
}

export function StatsGrid({ stats, className }: StatsGridProps) {
  if (!stats || stats.length === 0) return null;

  return (
    <div
      style={{ "--stats-columns": stats.length } as CSSProperties}
      className={cn(
        "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-[repeat(var(--stats-columns),minmax(0,1fr))]",
        className
      )}
    >
      {stats.map((stat) => (
        <StatsCard key={stat.title} {...stat} />
      ))}
    </div>
  );
}
