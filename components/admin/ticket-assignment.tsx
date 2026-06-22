"use client";

import { useEffect, useState } from "react";
import { assignTicket } from "@/actions/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { NameWithRole } from "@/components/shared/name-with-role";

interface TicketAssignmentProps {
  ticketId: string;
  currentAssignedToId: string | null;
  supportStaff: Array<{ id: string; name: string; email: string; role?: string }>;
}

export function TicketAssignment({
  ticketId,
  currentAssignedToId,
  supportStaff,
}: TicketAssignmentProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>(
    currentAssignedToId || "unassigned"
  );

  useEffect(() => {
    if (isUpdating) return;
    setSelectedValue(currentAssignedToId || "unassigned");
  }, [currentAssignedToId, isUpdating]);

  const handleAssign = async (value: string) => {
    if (value === selectedValue) return;
    const previousValue = selectedValue;
    setSelectedValue(value);
    setIsUpdating(true);

    try {
      const assignedToId = value === "unassigned" ? null : value;
      const result = await assignTicket(ticketId, assignedToId);

      if (result.success) {
        const nextAssignedToId =
          (result.data as any)?.assignedToId ?? assignedToId;
        setSelectedValue(nextAssignedToId || "unassigned");
        toast.success(
          value !== "unassigned"
            ? "Ticket assigned successfully"
            : "Ticket unassigned successfully"
        );
        router.refresh();
      } else {
        setSelectedValue(previousValue);
        toast.error(result.error || "Failed to assign ticket");
      }
    } catch (error) {
      console.error("Assignment error:", error);
      setSelectedValue(previousValue);
      toast.error("Failed to assign ticket");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select
      value={selectedValue}
      onValueChange={handleAssign}
      disabled={isUpdating}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select assignee" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {supportStaff.map((staff, index) => (
          <SelectItem key={`${staff.id}-${index}`} value={staff.id}>
            <NameWithRole
              name={staff.name}
              role={staff.role}
              className="text-sm"
              badgeClassName="h-4 px-2 text-[10px]"
            />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
