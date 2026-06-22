"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import type { TicketTrendData } from "@/actions/analytics";

interface TicketTrendsChartProps {
  data: TicketTrendData[];
}

export function TicketTrendsChart({ data }: TicketTrendsChartProps) {
  const totalCreated = data?.reduce((sum, d) => sum + d.created, 0) || 0;
  const totalResolved = data?.reduce((sum, d) => sum + d.resolved, 0) || 0;

  return (
    <Card className="border-border rounded-2xl shadow-sm overflow-hidden py-4">
      <CardHeader className="border-b border-border bg-muted/20 pb-4!">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <div className="p-2 rounded-lg bg-info/15">
              <TrendingUp className="h-4 w-4 text-info" />
            </div>
            Ticket Trends
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-info" />
              <span className="text-muted-foreground">Created ({totalCreated})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-success" />
              <span className="text-muted-foreground">Resolved ({totalResolved})</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="created"
                stroke="hsl(var(--info))"
                strokeWidth={2}
                fill="url(#colorCreated)"
                name="Created"
              />
              <Area
                type="monotone"
                dataKey="resolved"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                fill="url(#colorResolved)"
                name="Resolved"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
