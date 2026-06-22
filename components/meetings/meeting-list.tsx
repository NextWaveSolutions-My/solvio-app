"use client";

import type { Meeting } from "@/types";
import { MeetingCard } from "./meeting-card";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface MeetingListProps {
  meetings: Meeting[];
  users: Record<string, { name: string; email: string; role: string; image?: string }>;
  currentUserRole: string;
}

export function MeetingList({
  meetings,
  users,
  currentUserRole,
}: MeetingListProps) {
  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            No meetings scheduled yet.
            {currentUserRole !== "customer" &&
              " Click 'Schedule Meeting' to create one."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {meetings.map((meeting) => (
        <MeetingCard
          key={meeting._id.toString()}
          meeting={meeting}
          users={users}
          currentUserRole={currentUserRole}
        />
      ))}
    </div>
  );
}

