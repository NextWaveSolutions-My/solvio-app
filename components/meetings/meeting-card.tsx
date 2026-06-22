"use client";

import { useState } from "react";
import {
  updateMeeting,
  deleteMeeting,
  confirmMeetingAttendance,
} from "@/actions/meetings";
import type { Meeting } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NameWithRole } from "@/components/shared/name-with-role";
import { RescheduleRequestDialog } from "./reschedule-request-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Video,
  Calendar,
  Clock,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Loader2,
  CalendarClock,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { MeetingEditor } from "./meeting-editor";
import { TIMEZONES } from "@/components/ui/timezones";

interface MeetingCardProps {
  meeting: Meeting;
  users: Record<string, { name: string; email: string; role: string; image?: string }>;
  currentUserRole: string;
}

export function MeetingCard({
  meeting,
  users,
  currentUserRole,
}: MeetingCardProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);

  const canManage =
    currentUserRole === "admin" || currentUserRole === "support";
  const isCustomer = currentUserRole === "customer";
  const organizer = users[meeting.userId];

  const handleStatusChange = async (
    status: "completed" | "cancelled",
    reason?: string
  ) => {
    setIsUpdating(true);

    const result = await updateMeeting(meeting._id.toString(), {
      status,
      cancellationReason: reason,
    });

    if (result.success) {
      toast.success(
        status === "completed"
          ? "Meeting marked as completed"
          : "Meeting cancelled"
      );
      router.refresh();
    } else {
      toast.error(result.error || "Failed to update meeting");
    }

    setIsUpdating(false);
  };

  const handleDelete = async () => {
    setIsUpdating(true);

    const result = await deleteMeeting(meeting._id.toString());

    if (result.success) {
      toast.success("Meeting deleted successfully");
      setShowDeleteDialog(false);
      router.refresh();
    } else {
      toast.error(result.error || "Failed to delete meeting");
    }

    setIsUpdating(false);
  };

  const handleConfirmAttendance = async () => {
    setIsUpdating(true);

    const result = await confirmMeetingAttendance(meeting._id.toString());

    if (result.success) {
      toast.success("Attendance confirmed successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to confirm attendance");
    }

    setIsUpdating(false);
  };

  const getStatusBadge = () => {
    switch (meeting.status) {
      case "scheduled":
        return (
          <Badge variant="default" className="bg-blue-500">
            <Calendar className="mr-1 h-3 w-3" />
            Scheduled
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Cancelled
          </Badge>
        );
    }
  };

  const getPlatformIcon = () => {
    return <Video className="h-4 w-4" />;
  };

  const getPlatformName = () => {
    return meeting.platform === "zoom" ? "Zoom" : "Google Meet";
  };

  const getTimezoneLabel = () => {
    if (!meeting.timezone) return null;
    const timezone = TIMEZONES.find((tz) => tz.value === meeting.timezone);
    return timezone ? timezone.label : meeting.timezone;
  };

  const getFormattedScheduledAt = () => {
    const date = new Date(meeting.scheduledAt);
    const timeZone = meeting.timezone;

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: timeZone || "UTC",
    }).format(date);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getPlatformIcon()}
                <span className="text-sm font-medium text-muted-foreground">
                  {getPlatformName()}
                </span>
                {getStatusBadge()}
              </div>
              <CardTitle className="text-lg">{meeting.title}</CardTitle>
            </div>

            {canManage && meeting.status === "scheduled" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isUpdating}
                    className="h-8 w-8 p-0"
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Meeting
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("completed")}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark as Completed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("cancelled")}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Meeting
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Meeting
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Meeting Details */}
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{getFormattedScheduledAt()}</span>
            </div>

            {meeting.duration && (
              <div className="flex items-center text-sm">
                <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{meeting.duration} minutes</span>
              </div>
            )}

            {meeting.timezone && (
              <div className="flex items-center text-sm">
                <Globe className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{getTimezoneLabel()}</span>
              </div>
            )}

            {organizer && (
              <div className="flex items-center text-sm">
                <span className="text-muted-foreground mr-2">
                  Organized by:
                </span>
                <NameWithRole
                  name={organizer.name}
                  role={(organizer as { role?: string })?.role}
                  className="font-medium"
                  badgeClassName="h-4 px-2 text-[10px]"
                />
              </div>
            )}
          </div>

          {/* Description */}
          {meeting.description && (
            <div className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
              {meeting.description}
            </div>
          )}

          {/* Customer Confirmation Status */}
          {meeting.customerConfirmation?.confirmed && (
            <div className="text-sm p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-900 dark:text-green-100">
                  Attendance Confirmed
                </span>
                {meeting.customerConfirmation.confirmedAt && (
                  <span className="text-xs text-green-700 dark:text-green-300 ml-auto">
                    {new Date(
                      meeting.customerConfirmation.confirmedAt
                    ).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Reschedule Request Info */}
          {meeting.rescheduleRequest && (
            <div className="text-sm p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
              <div className="flex items-center gap-2 mb-2">
                <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  Reschedule Request
                </span>
                <Badge
                  variant={
                    meeting.rescheduleRequest.status === "pending"
                      ? "secondary"
                      : meeting.rescheduleRequest.status === "approved"
                      ? "default"
                      : "destructive"
                  }
                  className="ml-auto"
                >
                  {meeting.rescheduleRequest.status.charAt(0).toUpperCase() +
                    meeting.rescheduleRequest.status.slice(1)}
                </Badge>
              </div>
              <div className="space-y-1 text-blue-800 dark:text-blue-200">
                <p>
                  <span className="font-medium">Preferred Time:</span>{" "}
                  {new Date(
                    meeting.rescheduleRequest.preferredTime
                  ).toLocaleString()}
                </p>
                {meeting.rescheduleRequest.reason && (
                  <p>
                    <span className="font-medium">Reason:</span>{" "}
                    {meeting.rescheduleRequest.reason}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Meeting Link */}
          {meeting.meetingLink && (
            <div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(meeting.meetingLink, "_blank")}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Join Meeting
              </Button>
            </div>
          )}

          {/* Customer Action Buttons */}
          {isCustomer && meeting.status === "scheduled" && (
            <div className="space-y-2">
              {/* Confirm Attendance Button */}
              {!meeting.customerConfirmation?.confirmed && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleConfirmAttendance}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirm Attendance
                    </>
                  )}
                </Button>
              )}

              {/* Request Reschedule Button */}
              {!meeting.rescheduleRequest && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowRescheduleDialog(true)}
                  disabled={isUpdating}
                >
                  <CalendarClock className="mr-2 h-4 w-4" />
                  Request Reschedule
                </Button>
              )}
            </div>
          )}

          {/* Cancellation Reason */}
          {meeting.status === "cancelled" && meeting.cancellationReason && (
            <div className="text-sm p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <span className="font-medium">Cancellation Reason: </span>
              {meeting.cancellationReason}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {showEditDialog && (
        <MeetingEditor
          meeting={meeting}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
        />
      )}

      {/* Reschedule Request Dialog */}
      {showRescheduleDialog && (
        <RescheduleRequestDialog
          meetingId={meeting._id.toString()}
          open={showRescheduleDialog}
          onOpenChange={setShowRescheduleDialog}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meeting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this meeting? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isUpdating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
