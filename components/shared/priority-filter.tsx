"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface PriorityFilterProps {
  defaultValue?: string;
  className?: string;
}

export function PriorityFilter({ defaultValue, className }: PriorityFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePriorityChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "all") {
      params.delete("priority");
    } else {
      params.set("priority", value);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select
      defaultValue={defaultValue || "all"}
      onValueChange={handlePriorityChange}
    >
      <SelectTrigger className={cn("h-9 w-full text-sm sm:w-[140px]", className)}>
        <SelectValue placeholder="All Priorities" />
      </SelectTrigger>
      <SelectContent>
        {PRIORITY_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
