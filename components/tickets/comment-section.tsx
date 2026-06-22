"use client";

import { toast } from "sonner";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { addComment, updateComment } from "@/actions/comments";
import { uploadAttachment } from "@/actions/attachments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Lock,
  Reply,
  X,
  PencilLine,
  Check,
  Undo2,
  Paperclip,
  FileText,
  Download,
} from "lucide-react";
import { createCommentSchema } from "@/lib/validations";
import type { Attachment, Comment } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NameWithRole } from "@/components/shared/name-with-role";
import { cn } from "@/lib/utils";
import { buildAcceptAttribute } from "@/lib/file-type-utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type UserMap = Record<
  string,
  { name: string; email: string; role: string; image?: string }
>;

interface CommentSectionProps {
  ticketId: string;
  comments: Comment[];
  users: UserMap;
  currentUserRole: string;
  currentUserId?: string;
  attachments?: Attachment[];
  fileUploadsEnabled?: boolean;
}

const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function AttachmentChips({
  items,
  onPreview,
}: {
  items: Attachment[];
  onPreview: (attachment: Attachment) => void;
}) {
  if (!items.length) return null;
  const images = items.filter((a) => a.mimeType?.startsWith("image/"));
  const files = items.filter((a) => !a.mimeType?.startsWith("image/"));
  return (
    <div className="mt-2 space-y-2">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((a) => (
            <button
              type="button"
              key={a._id.toString()}
              onClick={() => onPreview(a)}
              className="group relative block h-20 w-20 overflow-hidden rounded-md border bg-muted"
              title={a.originalFilename}
            >
              <Image
                src={a.url}
                alt={a.originalFilename}
                fill
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((a) => (
            <button
              type="button"
              key={a._id.toString()}
              onClick={() => onPreview(a)}
              className="group inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs hover:bg-muted transition-colors max-w-xs"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate font-medium">
                {a.originalFilename}
              </span>
              <span className="text-muted-foreground shrink-0">
                {formatFileSize(a.fileSize)}
              </span>
              <Download className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ComposerProps {
  ticketId: string;
  parentCommentId?: string;
  currentUserRole: string;
  fileUploadsEnabled: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  onPosted: () => void;
  onCancel?: () => void;
}

function Composer({
  ticketId,
  parentCommentId,
  currentUserRole,
  fileUploadsEnabled,
  placeholder = "Type your message here...",
  autoFocus = false,
  compact = false,
  onPosted,
  onCancel,
}: ComposerProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isStaff = currentUserRole === "admin" || currentUserRole === "support";

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    const valid: File[] = [];
    for (const f of picked) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} exceeds 20MB`);
        continue;
      }
      if (!DEFAULT_ALLOWED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: type not allowed`);
        continue;
      }
      valid.push(f);
    }
    setFiles((prev) => [...prev, ...valid]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed && files.length === 0) {
      toast.error("Write a message or attach a file");
      return;
    }
    if (!trimmed) {
      toast.error("Message cannot be empty");
      return;
    }

    try {
      const parsed = createCommentSchema.parse({
        content: trimmed,
        isInternal,
        parentCommentId,
      });
      setIsSubmitting(true);

      // Upload files first (option A — orphans acceptable if post fails)
      let attachmentIds: string[] = [];
      if (files.length > 0 && fileUploadsEnabled) {
        const uploads = await Promise.all(
          files.map(async (file) => {
            const fd = new FormData();
            fd.append("file", file);
            const res = await uploadAttachment(ticketId, fd);
            if (!res.success || !res.data) {
              throw new Error(res.error || `Failed to upload ${file.name}`);
            }
            return res.data._id.toString();
          })
        );
        attachmentIds = uploads;
      }

      const result = await addComment(ticketId, {
        ...parsed,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to post comment");
      }

      toast.success(parentCommentId ? "Reply posted" : "Comment posted");
      setContent("");
      setIsInternal(false);
      setFiles([]);
      onPosted();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-2", compact && "text-sm")}>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        disabled={isSubmitting}
        autoFocus={autoFocus}
        className={cn(
          "resize-none",
          !compact && "border-0 shadow-none focus-visible:ring-0 focus-visible:border-0 px-0 py-0"
        )}
      />

      {files.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-md border bg-muted px-2 py-1 text-xs"
            >
              <FileText className="h-3 w-3 text-muted-foreground" />
              <span className="max-w-45 truncate">{f.name}</span>
              <span className="text-muted-foreground">
                {formatFileSize(f.size)}
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                disabled={isSubmitting}
                className="ml-0.5 rounded hover:bg-background p-0.5"
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {fileUploadsEnabled && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFilesSelected}
                accept={buildAcceptAttribute(DEFAULT_ALLOWED_TYPES)}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handlePickFiles}
                disabled={isSubmitting}
                className="h-8 w-8"
                aria-label="Attach file"
                title="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </>
          )}
          {isStaff && (
            <button
              type="button"
              onClick={() => setIsInternal((v) => !v)}
              disabled={isSubmitting}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
                isInternal
                  ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-200"
                  : "text-muted-foreground hover:bg-muted"
              )}
              aria-pressed={isInternal}
              title="Internal note (staff only)"
            >
              <Lock className="h-3 w-3" />
              Internal
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
              className="h-8"
            >
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isSubmitting} className="h-8">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Posting
              </>
            ) : parentCommentId ? (
              "Reply"
            ) : (
              "Comment"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function CommentSection({
  ticketId,
  comments,
  users,
  currentUserRole,
  currentUserId,
  attachments = [],
  fileUploadsEnabled = false,
}: CommentSectionProps) {
  const router = useRouter();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(
    null
  );

  const topLevelComments = comments?.filter((c) => !c.parentCommentId) || [];
  const getReplies = (commentId: string) =>
    comments?.filter((c) => c.parentCommentId === commentId) || [];

  const attachmentsByComment = attachments.reduce<Record<string, Attachment[]>>(
    (acc, a) => {
      const key = a.commentId;
      if (!key) return acc;
      (acc[key] ||= []).push(a);
      return acc;
    },
    {}
  );
  const orphanAttachments = attachments.filter((a) => !a.commentId);

  const startEdit = (comment: Comment) => {
    setEditingId(comment._id.toString());
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = async (comment: Comment) => {
    const trimmed = editContent?.trim() ?? "";
    if (trimmed.length < 1) {
      toast.error("Comment cannot be empty");
      return;
    }
    if (trimmed.length > 2000) {
      toast.error("Comment must not exceed 2000 characters");
      return;
    }

    try {
      setIsSavingEdit(true);
      const result = await updateComment(ticketId, comment._id.toString(), {
        content: trimmed,
        expectedUpdatedAt:
          typeof comment.updatedAt === "string"
            ? comment.updatedAt
            : new Date(comment.updatedAt).toISOString(),
      });

      if (result.success) {
        toast.success("Comment updated");
        setEditingId(null);
        setEditContent("");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to update comment");
      }
    } catch (e) {
      console.error(e);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const renderThread = (comment: Comment, depth: number = 0) => {
    const user = users?.[comment.userId];
    const isInternal = comment.isInternal;
    const replies = getReplies(comment._id.toString());
    const isOwner = currentUserId && comment.userId === currentUserId;
    const isEdited =
      comment.updatedAt &&
      new Date(comment.updatedAt).getTime() >
        new Date(comment.createdAt).getTime();
    const commentAttachments =
      attachmentsByComment[comment._id.toString()] || [];
    const isEditing = editingId === comment._id.toString();
    const isReplying = replyingTo === comment._id.toString();

    return (
      <div key={comment._id.toString()} className="group">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0 mt-0.5">
            {user?.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback className="text-xs">
              {user ? getInitials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                "rounded-md px-3 py-2 transition-colors",
                isInternal
                  ? "bg-yellow-50 dark:bg-yellow-950/20 border-l-2 border-yellow-400"
                  : "bg-muted/40 group-hover:bg-muted/60"
              )}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <NameWithRole
                  name={user?.name}
                  role={user?.role}
                  className="text-sm font-semibold"
                  badgeClassName="h-4 px-2 text-[10px]"
                />
                {isInternal && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-yellow-800 dark:text-yellow-300">
                    <Lock className="h-2.5 w-2.5" />
                    Internal
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                {isEdited && (
                  <span className="text-[10px] text-muted-foreground">
                    (edited)
                  </span>
                )}
                {isOwner && !isEditing && (
                  <button
                    type="button"
                    onClick={() => startEdit(comment)}
                    className="ml-auto text-xs text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-opacity inline-flex items-center gap-1"
                    aria-label="Edit comment"
                  >
                    <PencilLine className="h-3 w-3" />
                    Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {editContent.length}/2000
                    </p>
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        disabled={isSavingEdit}
                        className="h-7 text-xs"
                      >
                        <Undo2 className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveEdit(comment)}
                        disabled={isSavingEdit}
                        className="h-7 text-xs"
                      >
                        {isSavingEdit ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                  {comment.content}
                </p>
              )}

              {commentAttachments.length > 0 && (
                <AttachmentChips
                  items={commentAttachments}
                  onPreview={setPreviewAttachment}
                />
              )}
            </div>

            {!isEditing && (
              <div className="mt-1 flex items-center gap-3 pl-3">
                <button
                  type="button"
                  onClick={() =>
                    setReplyingTo(isReplying ? null : comment._id.toString())
                  }
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
                >
                  <Reply className="h-3 w-3" />
                  Reply
                </button>
              </div>
            )}

            {isReplying && (
              <div className="mt-3 pl-3">
                <Composer
                  ticketId={ticketId}
                  parentCommentId={comment._id.toString()}
                  currentUserRole={currentUserRole}
                  fileUploadsEnabled={fileUploadsEnabled}
                  placeholder={`Reply to ${user?.name || "user"}...`}
                  autoFocus
                  compact
                  onPosted={() => setReplyingTo(null)}
                  onCancel={() => setReplyingTo(null)}
                />
              </div>
            )}

            {replies.length > 0 && (
              <div className="mt-4 space-y-4 border-l pl-4 ml-1">
                {replies.map((r) => renderThread(r, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top composer for new top-level comment */}
      <div className="rounded-lg border bg-card p-3 focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/10 transition-colors">
        <Composer
          ticketId={ticketId}
          currentUserRole={currentUserRole}
          fileUploadsEnabled={fileUploadsEnabled}
          onPosted={() => {}}
        />
      </div>

      {/* Orphan attachments (pre-migration or uploaded out-of-band) */}
      {orphanAttachments.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Shared files
          </div>
          <AttachmentChips
            items={orphanAttachments}
            onPreview={setPreviewAttachment}
          />
        </div>
      )}

      {/* Thread */}
      {topLevelComments.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the conversation above.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {topLevelComments.map((c) => renderThread(c, 0))}
        </div>
      )}
      <Dialog
        open={Boolean(previewAttachment)}
        onOpenChange={(open) => {
          if (!open) setPreviewAttachment(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          {previewAttachment && (
            <div className="space-y-3">
              <DialogTitle className="text-sm font-medium truncate pr-8">
                {previewAttachment.originalFilename}
              </DialogTitle>
              {previewAttachment.mimeType?.startsWith("image/") ? (
                <div className="rounded-md border bg-muted/30 overflow-hidden">
                  <Image
                    src={previewAttachment.url}
                    alt={previewAttachment.originalFilename}
                    width={1600}
                    height={1200}
                    className="w-full max-h-[75vh] object-contain"
                  />
                </div>
              ) : (
                <iframe
                  src={previewAttachment.url}
                  title={previewAttachment.originalFilename}
                  className="h-[75vh] w-full rounded-md border"
                />
              )}
              <div className="flex justify-end">
                <a
                  href={previewAttachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Open in new tab
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
