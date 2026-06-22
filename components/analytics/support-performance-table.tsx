"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import type { SupportPerformance } from "@/actions/analytics";

interface SupportPerformanceTableProps {
  data: SupportPerformance[];
}

export function SupportPerformanceTable({
  data,
}: SupportPerformanceTableProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (hours: number) => {
    if (!hours || hours === 0) return "—";
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

  const getPerformanceColor = (rate: number) => {
    if (rate >= 70) return "text-success bg-success/15";
    if (rate >= 40) return "text-warning bg-warning/15";
    return "text-destructive bg-destructive/15";
  };

  const sortedData = [...data].sort(
    (a, b) => b.resolutionRate - a.resolutionRate
  );

  return (
    <Card className="border-border rounded-2xl shadow-sm overflow-hidden py-4">
      <CardHeader className="border-b border-border bg-muted/20 pb-4!">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <div className="p-2 rounded-lg bg-info/15">
            <Users className="h-4 w-4 text-info" />
          </div>
          Team Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            No support staff data available
          </p>
        ) : (
          <div className="space-y-3">
            {sortedData.map((staff, index) => (
              <div
                key={staff.userId}
                className="rounded-xl border border-border p-3 transition-all hover:border-info/40 hover:bg-muted/20"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Avatar with Image support */}
                    {staff.image ? (
                      <div className="relative h-9 w-9 rounded-full overflow-hidden shrink-0">
                        <Image
                          src={staff.image}
                          alt={staff.name}
                          fill
                          className="object-cover"
                          sizes="36px"
                        />
                      </div>
                    ) : (
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-info/20 to-info/5 flex items-center justify-center text-info font-semibold text-sm shrink-0">
                        {getInitials(staff.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-sm text-foreground truncate">
                          {staff.name}
                        </h3>
                        {index === 0 && data.length > 1 && (
                          <span className="text-xs bg-warning/15 text-warning px-1.5 py-0.5 rounded font-medium">
                            Top
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {staff.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <p className="font-medium text-foreground">{staff.assignedTickets}</p>
                      <p className="text-xs text-muted-foreground">Assigned</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">{staff.resolvedTickets}</p>
                      <p className="text-xs text-muted-foreground">Resolved</p>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-foreground">
                        {formatTime(staff.averageResolutionTime)}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Time</p>
                    </div>
                    <div className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getPerformanceColor(staff.resolutionRate)}`}>
                        {staff.resolutionRate}%
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">Rate</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
