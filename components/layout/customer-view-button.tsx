"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebarCollapsed } from "@/components/layout/app-sidebar";

export function CustomerViewButton() {
  const collapsed = useSidebarCollapsed();

  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn(
        "flex items-center gap-2",
        collapsed && "justify-center px-2"
      )}
    >
      <Link href="/dashboard">
        <ArrowLeft className="h-4 w-4" />
        <span className={cn("truncate", collapsed && "sr-only")}>
          Customer View
        </span>
      </Link>
    </Button>
  );
}

