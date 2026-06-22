"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import type { PriorityDistribution } from "@/actions/analytics";

interface PriorityDistributionChartProps {
  data: PriorityDistribution[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-success",
  medium: "bg-info",
  high: "bg-warning",
  urgent: "bg-destructive",
};

const LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const PRIORITY_ORDER = ["urgent", "high", "medium", "low"];

export function PriorityDistributionChart({
  data,
}: PriorityDistributionChartProps) {
  const sortedData = [...data].sort((a, b) =>
    PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  );

  const total = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="border-border rounded-2xl shadow-sm overflow-hidden py-4">
      <CardHeader className="border-b border-border bg-muted/20 pb-4!">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-2 rounded-lg bg-warning/15">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          Priority Distribution
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
              const barWidth = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.priority} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${PRIORITY_COLORS[item.priority] || "bg-muted-foreground"}`} />
                      <span className="text-foreground">
                        {LABELS[item.priority] || item.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.count}</span>
                      <span className="text-xs text-muted-foreground">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${PRIORITY_COLORS[item.priority] || "bg-muted-foreground"}`}
                      style={{ width: `${barWidth}%` }}
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
