"use client";

import { useState } from "react";
import { updateTicketStatus } from "@/actions/admin";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TicketStatusControlProps {
  ticketId: string;
  currentStatus: string;
}

export function TicketStatusControl({
  ticketId,
  currentStatus,
}: TicketStatusControlProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<
    | "open"
    | "scheduled_meeting"
    | "in_progress"
    | "waiting_on_customer"
    | "resolved"
    | "closed"
    | null
  >(null);
  const [message, setMessage] = useState("");

  const handleStatusChange = async (
    value:
      | "open"
      | "scheduled_meeting"
      | "in_progress"
      | "waiting_on_customer"
      | "resolved"
      | "closed"
  ) => {
    // Open dialog to optionally add a message
    setPendingStatus(value);
    setMessage("");
    setShowMessageDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;

    setIsUpdating(true);
    setShowMessageDialog(false);

    try {
      const result = await updateTicketStatus(
        ticketId,
        pendingStatus,
        message.trim() || undefined
      );

      if (result.success) {
        toast.success("Ticket status updated successfully");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update ticket status");
      }
    } catch (error) {
      console.error("Status update error:", error);
      toast.error("Failed to update ticket status");
    } finally {
      setIsUpdating(false);
      setPendingStatus(null);
      setMessage("");
    }
  };

  const cancelStatusChange = () => {
    setShowMessageDialog(false);
    setPendingStatus(null);
    setMessage("");
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open":
        return "Open";
      case "scheduled_meeting":
        return "Scheduled Meeting";
      case "in_progress":
        return "In Progress";
      case "waiting_on_customer":
        return "Waiting for Customer";
      case "resolved":
        return "Resolved";
      case "closed":
        return "Closed";
      default:
        return status;
    }
  };

  return (
    <>
      <Select
        value={currentStatus}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="scheduled_meeting">Scheduled Meeting</SelectItem>
          <SelectItem value="in_progress">In Progress</SelectItem>
          <SelectItem value="waiting_on_customer">
            Waiting for Customer
          </SelectItem>
          <SelectItem value="resolved">Resolved</SelectItem>
          <SelectItem value="closed">Closed</SelectItem>
        </SelectContent>
      </Select>

      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Ticket Status</DialogTitle>
            <DialogDescription>
              You are changing the status to{" "}
              <strong>{pendingStatus && getStatusLabel(pendingStatus)}</strong>.
              Optionally add a message to notify the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="status-message">
              Message to Customer (Optional)
            </Label>
            <Textarea
              id="status-message"
              placeholder="Add a message to include in the email notification..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This message will be included in the email notification sent to
              the customer.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelStatusChange}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button onClick={confirmStatusChange} disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
