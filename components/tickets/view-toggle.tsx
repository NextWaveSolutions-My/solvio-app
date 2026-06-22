"use client";

import { LayoutGrid, Table } from "lucide-react";

import { ViewModeToggle } from "@/components/shared/view-mode-toggle";

export function ViewToggle() {
  return (
    <ViewModeToggle
      paramName="view"
      defaultMode="table"
      modes={[
        { value: "table", label: "Table", icon: Table },
        { value: "card", label: "Cards", icon: LayoutGrid },
      ]}
    />
  );
}
