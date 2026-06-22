/**
 * Message Input Component
 *
 * Input field for composing and sending messages with typing indicators.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, X } from "lucide-react";
import { sendMessage } from "@/actions/messages";
import { uploadMessageAttachment } from "@/actions/message-attachments";
import { toast } from "sonner";
import { useSocketConnection } from "@/hooks/useSocketConnection";
import type { Message } from "@/types/realtime";

interface MessageInputProps {
  conversationId: string;
  userId: string;
  onMessageSent?: () => void;
  replyToMessage?: Message | null;
  onCancelReply?: () => void;
}

export function MessageInput({
  conversationId,
  userId,
  onMessageSent,
  replyToMessage,
  onCancelReply,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { socket } = useSocketConnection(userId);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket) {
        return;
      }

      socket.emit("chat:typing:set", { conversationId, isTyping });
    },
    [conversationId, socket]
  );

  // Handle typing indicator
  const handleTyping = () => {
    // Set typing to true
    setTyping(true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set typing to false after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 3000);
  };

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setTyping(false);
    };
  }, [setTyping]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file size (20MB max per file)
    const maxSize = 20 * 1024 * 1024;
    const validFiles = files.filter((file) => {
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Max size is 20MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles((prev) => [...prev, ...validFiles]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!content.trim() && selectedFiles.length === 0) || sending) return;

    setSending(true);
    setTyping(false); // Stop typing indicator

    try {
      // Send message first
      const result = await sendMessage({
        conversationId,
        content: content.trim() || "",
        replyToId: replyToMessage?.id ?? null,
      });

      if (result.success && result.data) {
        // Upload attachments if any
        if (selectedFiles.length > 0) {
          setUploading(true);
          for (const file of selectedFiles) {
            const formData = new FormData();
            formData.append("file", file);

            const uploadResult = await uploadMessageAttachment(
              result.data.id,
              formData
            );
            if (!uploadResult.success) {
              toast.error(
                `Failed to upload ${file.name}: ${uploadResult.error}`
              );
            }
          }
          setUploading(false);
        }

        setContent("");
        setSelectedFiles([]);
        onMessageSent?.();
        onCancelReply?.();
        // Focus back on textarea
        textareaRef.current?.focus();
      } else {
        toast.error(result.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* Replying to message indicator */}
      {replyToMessage && (
        <div className="flex items-start justify-between gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2 text-xs">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-blue-900 dark:text-blue-100 text-xs">
              Replying to {replyToMessage.sender_name || "User"}
            </p>
            {replyToMessage.content && (
              <p className="mt-0.5 line-clamp-2 text-blue-700 dark:text-blue-300 text-[11px]">
                {replyToMessage.content}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 bg-muted/50 rounded-lg border border-border/50">
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-background rounded-md border text-xs"
            >
              <Paperclip className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-[200px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="min-h-[44px] max-h-[200px] resize-none pr-20 rounded-xl border-border/50 bg-background text-sm"
            disabled={sending || uploading}
          />

          {/* File upload button inside textarea */}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute right-2 bottom-2 h-7 w-7 rounded-full hover:bg-accent"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploading}
          >
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,application/pdf,text/*,.zip,.doc,.docx"
          />
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={
            (!content.trim() && selectedFiles.length === 0) ||
            sending ||
            uploading
          }
          className="h-[44px] w-[44px] shrink-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {uploading ? (
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}
