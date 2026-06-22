"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useFormatDate } from "@/components/providers/settings-provider";
import { NameWithRole } from "@/components/shared/name-with-role";
import {
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Paperclip,
  UserPlus,
  UserMinus,
  Edit,
  FileText,
  Video,
  Calendar,
  XCircle,
} from "lucide-react";

interface HistoryEntry {
  _id: string;
  ticketId: string;
  userId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  changes?: Record<string, { from: any; to: any }>;
  metadata?: Record<string, any>;
  createdAt: Date;
  user: {
    name: string;
    email: string;
    role?: string;
    image?: string;
  };
}

interface RequestHistoryProps {
  history: HistoryEntry[];
}

const getActionIcon = (action: string) => {
  switch (action) {
    case "created":
      return <FileText className="h-4 w-4" />;
    case "status_changed":
      return <AlertCircle className="h-4 w-4" />;
    case "priority_changed":
      return <AlertCircle className="h-4 w-4" />;
    case "assigned":
      return <UserPlus className="h-4 w-4" />;
    case "unassigned":
      return <UserMinus className="h-4 w-4" />;
    case "comment_added":
      return <MessageSquare className="h-4 w-4" />;
    case "comment_edited":
      return <Edit className="h-4 w-4" />;
    case "attachment_added":
      return <Paperclip className="h-4 w-4" />;
    case "updated":
      return <Edit className="h-4 w-4" />;
    case "resolved":
      return <CheckCircle className="h-4 w-4" />;
    case "closed":
      return <CheckCircle className="h-4 w-4" />;
    case "meeting_scheduled":
      return <Calendar className="h-4 w-4" />;
    case "meeting_updated":
      return <Edit className="h-4 w-4" />;
    case "meeting_completed":
      return <CheckCircle className="h-4 w-4" />;
    case "meeting_cancelled":
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case "created":
      return "text-blue-600 dark:text-blue-400";
    case "status_changed":
      return "text-purple-600 dark:text-purple-400";
    case "priority_changed":
      return "text-orange-600 dark:text-orange-400";
    case "assigned":
    case "unassigned":
      return "text-indigo-600 dark:text-indigo-400";
    case "comment_added":
      return "text-green-600 dark:text-green-400";
    case "comment_edited":
      return "text-yellow-600 dark:text-yellow-400";
    case "attachment_added":
      return "text-cyan-600 dark:text-cyan-400";
    case "updated":
      return "text-yellow-600 dark:text-yellow-400";
    case "resolved":
    case "closed":
      return "text-emerald-600 dark:text-emerald-400";
    case "meeting_scheduled":
      return "text-blue-600 dark:text-blue-400";
    case "meeting_updated":
      return "text-yellow-600 dark:text-yellow-400";
    case "meeting_completed":
      return "text-green-600 dark:text-green-400";
    case "meeting_cancelled":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
};

const formatStatusLabel = (status: string) => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getActionDescription = (entry: HistoryEntry) => {
  const { action, oldValue, newValue, changes, metadata } = entry;

  switch (action) {
    case "created":
      return "created this request";
    case "status_changed": {
      const fromStatus = changes?.status?.from || oldValue;
      const toStatus = changes?.status?.to || newValue;
      return (
        <>
          changed status from{" "}
          <Badge variant="outline" className="mx-1">
            {fromStatus ? formatStatusLabel(fromStatus) : "Unknown"}
          </Badge>{" "}
          to{" "}
          <Badge variant="outline" className="mx-1">
            {toStatus ? formatStatusLabel(toStatus) : "Unknown"}
          </Badge>
        </>
      );
    }
    case "priority_changed": {
      const fromPriority = changes?.priority?.from || oldValue;
      const toPriority = changes?.priority?.to || newValue;
      return (
        <>
          changed priority from{" "}
          <Badge variant="outline" className="mx-1">
            {fromPriority ? formatStatusLabel(fromPriority) : "Unknown"}
          </Badge>{" "}
          to{" "}
          <Badge variant="outline" className="mx-1">
            {toPriority ? formatStatusLabel(toPriority) : "Unknown"}
          </Badge>
        </>
      );
    }
    case "assigned":
      return "assigned this request";
    case "unassigned":
      return "unassigned this request";
    case "comment_added":
      return "added a comment";
    case "comment_edited":
      return "edited a comment";
    case "attachment_added":
      return metadata?.filename
        ? `uploaded attachment: ${metadata.filename}`
        : "uploaded an attachment";
    case "updated":
      return "updated the request details";
    case "resolved":
      return "marked this request as resolved";
    case "closed":
      return "closed this request";
    case "meeting_scheduled":
      return metadata?.meetingTitle
        ? `scheduled a meeting: ${metadata.meetingTitle}`
        : "scheduled a meeting";
    case "meeting_updated":
      return metadata?.meetingTitle
        ? `updated meeting: ${metadata.meetingTitle}`
        : "updated a meeting";
    case "meeting_completed":
      return metadata?.meetingTitle
        ? `completed meeting: ${metadata.meetingTitle}`
        : "completed a meeting";
    case "meeting_cancelled":
      return metadata?.meetingTitle
        ? `cancelled meeting: ${metadata.meetingTitle}`
        : "cancelled a meeting";
    default:
      return action.replace("_", " ");
  }
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function RequestHistory({ history }: RequestHistoryProps) {
  const formatDate = useFormatDate({ includeTime: true });
  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity history yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Log ({history.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry, index) => (
            <div key={entry._id.toString()}>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <Avatar className="h-8 w-8">
                    {entry.user.image && (
                      <AvatarImage
                        src={entry.user.image}
                        alt={entry.user.name}
                      />
                    )}
                    <AvatarFallback className="text-xs">
                      {getInitials(entry.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  {index < history.length - 1 && (
                    <div className="w-px h-full bg-border mt-2" />
                  )}
                </div>

                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`flex items-center gap-1 font-medium ${getActionColor(
                            entry.action
                          )}`}
                        >
                          {getActionIcon(entry.action)}
                          <NameWithRole
                            name={entry.user.name}
                            role={entry.user.role}
                            className="text-sm"
                            badgeClassName="h-4 px-2 text-[10px]"
                          />
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getActionDescription(entry)}
                      </p>
                    </div>
                    <time className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(new Date(entry.createdAt))}
                    </time>
                  </div>
                </div>
              </div>
              {index < history.length - 1 && <Separator className="my-2" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
