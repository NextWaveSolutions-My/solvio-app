"use client";

import { useState, useRef } from "react";
import { uploadAttachment } from "@/actions/attachments";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildAcceptAttribute, resolveAllowedMimeType } from "@/lib/file-type-utils";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface FileUploadProps {
  ticketId: string;
  onUploadComplete?: () => void;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
}

export function FileUpload({
  ticketId,
  onUploadComplete,
  maxFileSize = 20971520, // 20MB default
  allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "text/plain",
    "application/zip",
    "application/x-zip-compressed",
  ],
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxFileSize) {
      const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(2);
      toast.error(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    const resolvedMimeType = resolveAllowedMimeType({
      mimeType: file.type,
      filename: file.name,
      allowedMimeTypes: allowedTypes,
    });
    if (!resolvedMimeType) {
      toast.error(
        `File type ${
          file.type || "unknown"
        } is not allowed. Allowed types: ${allowedTypes.join(", ")}`
      );
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const result = await uploadAttachment(ticketId, formData);

      if (result.success) {
        toast.success("File uploaded successfully!");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onUploadComplete?.();
      } else {
        toast.error(result.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* File Input */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
              id="file-upload"
              accept={buildAcceptAttribute(allowedTypes)}
            />
            <label htmlFor="file-upload" className="flex-1">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-foreground/30 transition-colors">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to select a file or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max size: {(maxFileSize / 1024 / 1024).toFixed(2)}MB
                </p>
              </div>
            </label>
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button onClick={handleUpload} disabled={isUploading} size="sm">
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isUploading}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Allowed File Types */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">Allowed file types:</p>
            <p>Images (JPEG, PNG, GIF, WebP), PDF, Text, ZIP</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
