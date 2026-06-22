/**
 * Message Thread Component
 *
 * Displays messages in a conversation with real-time updates.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useConversationMessages } from "@/hooks/useConversationMessages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFormatDate } from "@/components/providers/settings-provider";
import { markMessagesAsRead } from "@/actions/messages";
import { MessageReactions } from "@/components/messages/message-reactions";
import { MessageAttachments } from "@/components/messages/message-attachments";
import { MessageEditDialog } from "@/components/messages/message-edit-dialog";
import { deleteMessage } from "@/actions/message-editing";
import { MoreVertical, Edit, Trash2, Reply } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { toast } from "sonner";
import type {
  Message,
  ConversationParticipantWithUser,
} from "@/types/realtime";

interface MessageThreadProps {
  conversationId: string;
  userId: string;
  participants?: ConversationParticipantWithUser[];
  onReplyToMessage?: (message: Message) => void;
}

export function MessageThread({
  conversationId,
  userId,
  participants,
  onReplyToMessage,
}: MessageThreadProps) {
  const formatDate = useFormatDate({ includeTime: true });
  const { messages, loading, typingUsers } = useConversationMessages(
    conversationId,
    userId
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState<
    string | null
  >(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read when they come into view
  useEffect(() => {
    if (messages.length === 0) return;

    const unreadMessages = messages.filter(
      (msg) =>
        msg.sender_id !== userId &&
        (!msg.read_by || !msg.read_by.includes(userId))
    );

    if (unreadMessages.length > 0) {
      const messageIds = unreadMessages.map((msg) => msg.id);
      markMessagesAsRead({ conversationId, messageIds });
    }
  }, [messages, conversationId, userId]);

  const handleDeleteMessageConfirm = async () => {
    if (!pendingDeleteMessageId) return;
    if (isDeleting) return;
    setIsDeleting(true);
    const result = await deleteMessage(pendingDeleteMessageId);
    if (result.success) {
      toast.success("Message deleted");
      setDeleteDialogOpen(false);
      setPendingDeleteMessageId(null);
    } else {
      toast.error(result.error || "Failed to delete message");
    }
    setIsDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn("flex gap-3", i % 2 === 0 ? "justify-end" : "")}
          >
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-20 w-64" />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-muted-foreground text-center">
          No messages yet. Start the conversation!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-3">
      {messages.map((message, index) => {
        const isOwnMessage = message.sender_id === userId;
        const isLastMessage = index === messages.length - 1;
        const showAvatar =
          index === 0 || messages[index - 1].sender_id !== message.sender_id;
        const showTimestamp =
          index === messages.length - 1 ||
          messages[index + 1].sender_id !== message.sender_id;

        const senderParticipant = participants?.find(
          (p) => p.user_id === message.sender_id
        );
        const senderImage = senderParticipant?.user_image;
        const senderDisplayName =
          senderParticipant?.user_name || message.sender_name;

        const repliedToMessage = message.reply_to_id
          ? messages.find((m) => m.id === message.reply_to_id)
          : undefined;

        return (
          <div
            key={message.id}
            className={cn(
              "flex gap-2 group",
              isOwnMessage ? "justify-end" : "justify-start"
            )}
          >
            {!isOwnMessage && (
              <div className="shrink-0">
                {showAvatar ? (
                  <Avatar className="h-7 w-7">
                    {senderImage ? (
                      <AvatarImage
                        src={senderImage}
                        alt={senderDisplayName || "User"}
                      />
                    ) : (
                      <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-semibold">
                        {senderDisplayName?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    )}
                  </Avatar>
                ) : (
                  <div className="h-7 w-7" />
                )}
              </div>
            )}

            <div
              className={cn(
                "flex flex-col gap-0.5 max-w-[75%]",
                isOwnMessage ? "items-end" : "items-start"
              )}
            >
              <div className="relative group/message">
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 wrap-break-word shadow-sm",
                    isOwnMessage
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-card border border-border/50 rounded-bl-md",
                    message.is_deleted && "opacity-60"
                  )}
                >
                  {!message.is_deleted && repliedToMessage && (
                    <div className="mb-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-background/40 border-l-2 border-border/70">
                      <p className="font-medium text-[10px] text-muted-foreground line-clamp-1">
                        {repliedToMessage.sender_name || "User"}
                      </p>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground/80">
                        {repliedToMessage.content || "[Attachment]"}
                      </p>
                    </div>
                  )}

                  {message.is_deleted ? (
                    <p className="italic text-xs">[Message deleted]</p>
                  ) : (
                    <>
                      {message.content && (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      )}
                      {message.is_edited && (
                        <span className="text-[10px] opacity-60 ml-1">
                          (edited)
                        </span>
                      )}
                    </>
                  )}
                </div>

                {/* Message actions: reactions, reply, more */}
                {!message.is_deleted && (
                  <div
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 transition-opacity",
                      isLastMessage
                        ? "opacity-100"
                        : "opacity-0 group-hover/message:opacity-100",
                      isOwnMessage
                        ? "left-0 -translate-x-full mr-1.5 flex-row-reverse"
                        : "right-0 translate-x-full ml-1.5 flex-row"
                    )}
                  >
                    <MessageReactions
                      messageId={message.id}
                      currentUserId={userId}
                      reactions={message.reactions}
                    />

                    {onReplyToMessage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 hover:bg-accent rounded-full"
                        onClick={() => onReplyToMessage(message)}
                        title="Reply to message"
                      >
                        <Reply className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    {isOwnMessage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0 hover:bg-accent rounded-full"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingMessage(message)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setPendingDeleteMessageId(message.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>

              {/* Attachments */}
              {!message.is_deleted && (
                <div className="w-full px-3">
                  <MessageAttachments
                    currentUserId={userId}
                    uploadedBy={message.sender_id}
                    attachments={message.attachments}
                  />
                </div>
              )}

              {showTimestamp && (
                <span className="text-[10px] text-muted-foreground/70 px-1">
                  {formatDate(new Date(message.created_at))}
                  {isOwnMessage &&
                    message.read_by &&
                    message.read_by.length > 1 && (
                      <span className="ml-1.5 text-blue-600 dark:text-blue-400 font-medium">
                        SA
                      </span>
                    )}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <div className="flex gap-2 items-center">
          <Avatar className="h-7 w-7">
            <div className="flex h-full w-full items-center justify-center bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-semibold">
              {typingUsers[0].user_name?.[0]?.toUpperCase() || "?"}
            </div>
          </Avatar>
          <div className="bg-card border border-border/50 rounded-2xl rounded-bl-md px-3.5 py-2 shadow-sm">
            <div className="flex gap-1 text-muted-foreground">
              <span className="animate-bounce delay-0 text-xs">●</span>
              <span className="animate-bounce delay-100 text-xs">●</span>
              <span className="animate-bounce delay-200 text-xs">●</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />

      {/* Edit Message Dialog */}
      {editingMessage && (
        <MessageEditDialog
          message={editingMessage}
          open={!!editingMessage}
          onOpenChange={(open) => !open && setEditingMessage(null)}
          onSuccess={() => setEditingMessage(null)}
        />
      )}

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteMessageId(null);
          if (!isDeleting) setDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMessageConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
