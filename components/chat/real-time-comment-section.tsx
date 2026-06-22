"use client";

import { useState, useEffect } from "react";
import { CommentSection } from "@/components/tickets/comment-section";
import { useSocketConnection } from "@/hooks/useSocketConnection";
import type { Attachment, Comment } from "@/types";
import type { SerializedComment } from "@/types/realtime";

interface RealTimeCommentSectionProps {
  ticketId: string;
  initialComments: Comment[];
  attachments?: Attachment[];
  users: Record<
    string,
    { name: string; email: string; role: string; image?: string }
  >;
  currentUserRole: string;
  currentUserId?: string;
  fileUploadsEnabled?: boolean;
}

/**
 * Real-time comment section component
 *
 * This component wraps the CommentSection and adds real-time updates.
 * For now, it uses the initial comments and relies on page revalidation.
 * Future enhancement: Add WebSocket or polling for real-time updates.
 */
export function RealTimeCommentSection({
  ticketId,
  initialComments,
  attachments = [],
  users,
  currentUserRole,
  currentUserId,
  fileUploadsEnabled = false,
}: RealTimeCommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const { socket } = useSocketConnection(currentUserId || null);

  // Update comments when initialComments change (e.g., after page revalidation)
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    if (!socket || !currentUserId) {
      return;
    }

    const joinTicket = () => {
      socket.emit("ticket:join", { ticketId });
    };

    const handleCommentCreated = ({
      ticketId: updatedTicketId,
      comment,
    }: {
      ticketId: string;
      comment: SerializedComment;
    }) => {
      if (updatedTicketId !== ticketId) {
        return;
      }

      setComments((current) => {
        const exists = current.some(
          (entry) => entry._id?.toString?.() === comment._id.toString()
        );
        if (exists) {
          return current;
        }

        return [...current, comment as unknown as Comment].sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
        );
      });
    };

    const handleCommentUpdated = ({
      ticketId: updatedTicketId,
      comment,
    }: {
      ticketId: string;
      comment: SerializedComment;
    }) => {
      if (updatedTicketId !== ticketId) {
        return;
      }

      setComments((current) =>
        current.map((entry) =>
          entry._id?.toString?.() === comment._id.toString()
            ? (comment as unknown as Comment)
            : entry
        )
      );
    };

    const handleCommentDeleted = ({
      ticketId: updatedTicketId,
      commentId,
    }: {
      ticketId: string;
      commentId: string;
    }) => {
      if (updatedTicketId !== ticketId) {
        return;
      }

      setComments((current) =>
        current.filter(
          (entry) => entry._id?.toString?.() !== commentId.toString()
        )
      );
    };

    joinTicket();
    socket.on("connect", joinTicket);
    socket.on("comment:created", handleCommentCreated);
    socket.on("comment:updated", handleCommentUpdated);
    socket.on("comment:deleted", handleCommentDeleted);

    return () => {
      socket.emit("ticket:leave", { ticketId });
      socket.off("connect", joinTicket);
      socket.off("comment:created", handleCommentCreated);
      socket.off("comment:updated", handleCommentUpdated);
      socket.off("comment:deleted", handleCommentDeleted);
    };
  }, [currentUserId, socket, ticketId]);

  return (
    <CommentSection
      ticketId={ticketId}
      comments={comments}
      attachments={attachments}
      users={users}
      currentUserRole={currentUserRole}
      currentUserId={currentUserId}
      fileUploadsEnabled={fileUploadsEnabled}
    />
  );
}
