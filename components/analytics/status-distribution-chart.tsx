"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { StatusDistribution } from "@/actions/analytics";

interface StatusDistributionChartProps {
  data: StatusDistribution[];
}

const COLORS: Record<string, string> = {
  open: "bg-warning",
  in_progress: "bg-info",
  waiting_on_customer: "bg-accent",
  resolved: "bg-success",
  closed: "bg-muted-foreground",
  scheduled_meeting: "bg-purple-500",
};

const LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_customer: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
  scheduled_meeting: "Meeting",
};

export function StatusDistributionChart({
  data,
}: StatusDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <Card className="border-border rounded-2xl shadow-sm overflow-hidden py-4">
      <CardHeader className="border-b border-border bg-muted/20 pb-4!">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-2 rounded-lg bg-success/15">
            <Activity className="h-4 w-4 text-success" />
          </div>
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No data available
          </p>
        ) : (
          <div className="space-y-3">
            {data.map((item) => {
              const percentage = Math.round((item.count / total) * 100);
              const barWidth = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${COLORS[item.status] || "bg-muted-foreground"}`} />
                      <span className="text-foreground">
                        {LABELS[item.status] || item.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.count}</span>
                      <span className="text-xs text-muted-foreground">({percentage}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${COLORS[item.status] || "bg-muted-foreground"}`}
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
