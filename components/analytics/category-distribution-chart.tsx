"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart } from "lucide-react";
import type { CategoryDistribution } from "@/actions/analytics";

interface CategoryDistributionChartProps {
  data: CategoryDistribution[];
}

const COLORS: Record<string, string> = {
  bug: "bg-destructive",
  feature_request: "bg-info",
  technical_support: "bg-accent",
  account: "bg-warning",
  general: "bg-muted-foreground",
};

const LABELS: Record<string, string> = {
  bug: "Bug",
  feature_request: "Feature Request",
  technical_support: "Technical Support",
  account: "Account",
  general: "General",
};

export function CategoryDistributionChart({
  data,
}: CategoryDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Sort by count descending
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <Card className="border-border rounded-2xl shadow-sm overflow-hidden py-4">
      <CardHeader className="border-b border-border bg-muted/20 pb-4!">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-2 rounded-lg bg-info/15">
            <PieChart className="h-4 w-4 text-info" />
          </div>
          Category Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No data available
          </p>
        ) : (
          <div className="space-y-3">
            {sortedData.map((item) => {
              const percentage = Math.round((item.count / total) * 100);
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${COLORS[item.category] || "bg-muted-foreground"}`} />
                      <span className="text-foreground capitalize">
                        {LABELS[item.category] || item.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.count}</span>
                      <span className="text-xs text-muted-foreground">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${COLORS[item.category] || "bg-muted-foreground"}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
