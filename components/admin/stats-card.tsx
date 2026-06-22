import { cn } from "@/lib/utils";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** @deprecated retained for backwards compatibility; icons now use a uniform muted tone */
  iconColor?: string;
  /** @deprecated retained for backwards compatibility; icons now use a uniform muted tone */
  iconBgColor?: string;
  className?: string;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: StatsCardProps) {
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown;

  return (
    <div
      className={cn(
        "flex h-full flex-col justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm font-medium text-muted-foreground">
          {title}
        </p>
        <Icon
          className="h-5 w-5 shrink-0 text-muted-foreground"
          strokeWidth={1.75}
        />
      </div>

      <div>
        <h3 className="text-[26px] font-bold leading-none tracking-tight text-foreground">
          {value}
        </h3>

        {(description || trend) && (
          <div className="mt-2 flex items-center gap-2 text-[13px]">
            {description && (
              <span className="text-muted-foreground">{description}</span>
            )}
            {trend && TrendIcon && (
              <span
                className={cn(
                  "flex items-center gap-0.5 font-semibold",
                  trend.isPositive ? "text-success" : "text-destructive",
                )}
              >
                <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                {Math.abs(trend.value)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
