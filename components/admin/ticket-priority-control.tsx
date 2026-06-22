"use client";

import { useState } from "react";
import { updateTicketPriority } from "@/actions/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TicketPriorityControlProps {
  ticketId: string;
  currentPriority: string;
}

export function TicketPriorityControl({
  ticketId,
  currentPriority,
}: TicketPriorityControlProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePriorityChange = async (
    value: "low" | "medium" | "high" | "urgent"
  ) => {
    setIsUpdating(true);

    try {
      const result = await updateTicketPriority(ticketId, value);

      if (result.success) {
        toast.success("Ticket priority updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update ticket priority");
      }
    } catch (error) {
      console.error("Priority update error:", error);
      toast.error("Failed to update ticket priority");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Select
      value={currentPriority}
      onValueChange={handlePriorityChange}
      disabled={isUpdating}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select priority" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="urgent">Urgent</SelectItem>
      </SelectContent>
    </Select>
  );
}

