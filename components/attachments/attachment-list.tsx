"use client";

import { useState } from "react";
import { deleteAttachment } from "@/actions/attachments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  File,
  Loader2,
} from "lucide-react";
import { useFormatDate } from "@/components/providers/settings-provider";
import { toast } from "sonner";
import type { Attachment } from "@/types";
import { NameWithRole } from "@/components/shared/name-with-role";

interface AttachmentListProps {
  attachments: Attachment[];
  users: Record<string, { name: string; email: string; role: string; image?: string }>;
  currentUserId: string;
  currentUserRole: string;
  onDelete?: () => void;
}

export function AttachmentList({
  attachments,
  users,
  currentUserId,
  currentUserRole,
  onDelete,
}: AttachmentListProps) {
  const formatDate = useFormatDate({ includeTime: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<string | null>(
    null
  );

  const handleDeleteClick = (attachmentId: string) => {
    setAttachmentToDelete(attachmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!attachmentToDelete) return;

    setDeletingId(attachmentToDelete);
    setDeleteDialogOpen(false);

    try {
      const result = await deleteAttachment(attachmentToDelete);

      if (result.success) {
        toast.success("Attachment deleted successfully");
        onDelete?.();
      } else {
        toast.error(result.error || "Failed to delete attachment");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete attachment");
    } finally {
      setDeletingId(null);
      setAttachmentToDelete(null);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5 text-info" />;
    } else if (mimeType === "application/pdf") {
      return <FileText className="h-5 w-5 text-destructive" />;
    } else {
      return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const canDelete = (attachment: Attachment): boolean => {
    // Admin and support can delete any attachment
    if (currentUserRole === "admin" || currentUserRole === "support") {
      return true;
    }
    // Customers can only delete their own attachments
    return attachment.userId === currentUserId;
  };

  if (attachments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No attachments yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Attachments ({attachments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attachments.map((attachment) => {
              const uploader = users[attachment.userId];
              const isDeleting = deletingId === attachment._id.toString();

              return (
                <div
                  key={attachment._id.toString()}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getFileIcon(attachment.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {attachment.filename}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(attachment.fileSize)}</span>
                        <span>•</span>
                        <span>{formatDate(new Date(attachment.uploadedAt))}</span>
                        {uploader && (
                          <>
                            <span>•</span>
                            <NameWithRole
                              name={uploader.name}
                              role={uploader.role}
                              className="text-xs"
                              badgeClassName="h-4 px-2 text-[10px]"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      disabled={isDeleting}
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={attachment.filename}
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>

                    {canDelete(attachment) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleDeleteClick(attachment._id.toString())
                        }
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
