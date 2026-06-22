"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw, LayoutDashboard } from "lucide-react";

interface AnalyticsHeaderProps {
  days: number;
}

export function AnalyticsHeader({ days }: AnalyticsHeaderProps) {
  const router = useRouter();

  const handleTimeRangeChange = (value: string) => {
    router.push(`/admin/analytics?days=${value}`);
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Comprehensive insights into your support ticket system
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Select value={days.toString()} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" className="h-9" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>

        <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>

        <Button asChild variant="outline" size="sm" className="h-9">
          <Link href="/admin">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
