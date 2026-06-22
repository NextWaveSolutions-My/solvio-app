"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { requestMeetingReschedule } from "@/actions/meetings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const rescheduleRequestSchema = z.object({
  preferredDate: z.string().min(1, "Preferred date is required"),
  preferredTime: z.string().min(1, "Preferred time is required"),
  reason: z.string().optional(),
});

type RescheduleRequestFormData = z.infer<typeof rescheduleRequestSchema>;

interface RescheduleRequestDialogProps {
  meetingId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RescheduleRequestDialog({
  meetingId,
  open,
  onOpenChange,
}: RescheduleRequestDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RescheduleRequestFormData>({
    resolver: zodResolver(rescheduleRequestSchema),
    defaultValues: {
      preferredDate: "",
      preferredTime: "",
      reason: "",
    },
  });

  const onSubmit = async (data: RescheduleRequestFormData) => {
    setIsSubmitting(true);

    try {
      // Combine date and time
      const preferredDateTime = new Date(`${data.preferredDate}T${data.preferredTime}`);

      // Check if the date is in the future
      if (preferredDateTime <= new Date()) {
        toast.error("Preferred time must be in the future");
        setIsSubmitting(false);
        return;
      }

      const result = await requestMeetingReschedule(
        meetingId,
        preferredDateTime,
        data.reason
      );

      if (result.success) {
        toast.success("Reschedule request submitted successfully");
        form.reset();
        onOpenChange(false);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to submit reschedule request");
      }
    } catch (error) {
      console.error("Error submitting reschedule request:", error);
      toast.error("An error occurred while submitting the request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Request Meeting Reschedule</DialogTitle>
          <DialogDescription>
            Submit a request to reschedule this meeting with your preferred time.
            The admin/support team will review your request.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="preferredDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please explain why you need to reschedule..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

