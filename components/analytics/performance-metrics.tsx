"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import type { ResponseTimeData, ResolutionTimeData } from "@/actions/analytics";

interface PerformanceMetricsProps {
  responseTime: ResponseTimeData;
  resolutionTime: ResolutionTimeData;
  resolutionRate: number;
}

export function PerformanceMetrics({
  responseTime,
  resolutionTime,
  resolutionRate,
}: PerformanceMetricsProps) {
  const formatTime = (hours: number) => {
    if (!hours || hours === 0) return "0m";
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
  };

  const performanceScore = Math.round(
    (resolutionRate +
      (responseTime?.averageResponseTime < 24 ? 100 : 50) +
      (resolutionTime?.averageResolutionTime < 48 ? 100 : 50)) /
    3
  );

  return (
    <Card className="border-border rounded-2xl shadow-sm overflow-hidden py-4">
      <CardHeader className="border-b border-border bg-muted/20 pb-4!">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-2 rounded-lg bg-accent/15">
            <BarChart3 className="h-4 w-4 text-accent" />
          </div>
          Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Response Time */}
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Avg Response Time</span>
              <span className="text-lg font-semibold text-foreground">
                {formatTime(responseTime?.averageResponseTime)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Fastest: {formatTime(responseTime?.fastestResponse)}</span>
              <span>Slowest: {formatTime(responseTime?.slowestResponse)}</span>
            </div>
          </div>

          {/* Resolution Time */}
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Avg Resolution Time</span>
              <span className="text-lg font-semibold text-foreground">
                {formatTime(resolutionTime?.averageResolutionTime)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Fastest: {formatTime(resolutionTime?.fastestResolution)}</span>
              <span>Slowest: {formatTime(resolutionTime?.slowestResolution)}</span>
            </div>
          </div>

          {/* Resolution Rate */}
          <div className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Resolution Rate</span>
              <span className="text-lg font-semibold text-foreground">{resolutionRate}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-success h-2 rounded-full transition-all"
                style={{ width: `${resolutionRate}%` }}
              />
            </div>
          </div>

          {/* Performance Score */}
          <div className="rounded-xl border border-border bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Performance Score</span>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${
                  performanceScore >= 70 ? "text-success" :
                  performanceScore >= 50 ? "text-warning" : "text-destructive"
                }`}>
                  {performanceScore}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
