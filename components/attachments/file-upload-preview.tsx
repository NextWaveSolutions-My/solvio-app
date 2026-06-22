"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildAcceptAttribute, resolveAllowedMimeType } from "@/lib/file-type-utils";
import { Upload, X, FileIcon, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface FileUploadPreviewProps {
  onFilesChange: (files: File[]) => void;
  maxFileSize?: number; // in bytes
  maxFiles?: number;
  allowedTypes?: string[];
  disabled?: boolean;
}

export function FileUploadPreview({
  onFilesChange,
  maxFileSize = 20971520, // 20MB default
  maxFiles = 5,
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
  disabled = false,
}: FileUploadPreviewProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of files) {
      // Check if we've reached max files
      if (selectedFiles.length + validFiles.length >= maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
        break;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        const maxSizeMB = (maxFileSize / 1024 / 1024).toFixed(2);
        errors.push(`${file.name}: File size exceeds ${maxSizeMB}MB`);
        continue;
      }

      // Validate file type
      const resolvedMimeType = resolveAllowedMimeType({
        mimeType: file.type,
        filename: file.name,
        allowedMimeTypes: allowedTypes,
      });
      if (!resolvedMimeType) {
        errors.push(`${file.name}: File type not allowed`);
        continue;
      }

      validFiles.push(file);
    }

    // Show errors if any
    if (errors.length > 0) {
      toast.error(errors.join("\n"));
    }

    // Add valid files
    if (validFiles.length > 0) {
      const newFiles = [...selectedFiles, ...validFiles];
      setSelectedFiles(newFiles);
      onFilesChange(newFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    onFilesChange(newFiles);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const isImage = (file: File): boolean => {
    return file.type.startsWith("image/");
  };

  return (
    <div className="space-y-4">
      {/* File Input */}
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={disabled || selectedFiles.length >= maxFiles}
          className="hidden"
          id="file-upload-preview"
          accept={buildAcceptAttribute(allowedTypes)}
          multiple
        />
        <label htmlFor="file-upload-preview" className="flex-1">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              disabled || selectedFiles.length >= maxFiles
                ? "border-border bg-muted text-muted-foreground cursor-not-allowed"
                : "border-border cursor-pointer hover:border-foreground/30"
            }`}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {selectedFiles.length >= maxFiles
                ? `Maximum ${maxFiles} files reached`
                : "Click to select files or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max size: {(maxFileSize / 1024 / 1024).toFixed(2)}MB per file •
              Max {maxFiles} files
            </p>
          </div>
        </label>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Selected Files ({selectedFiles.length}/{maxFiles})
          </p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {isImage(file) ? (
                    <ImageIcon className="h-5 w-5 text-info flex-shrink-0" />
                  ) : (
                    <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleRemoveFile(index)}
                  disabled={disabled}
                  variant="ghost"
                  size="sm"
                  className="ml-2 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allowed File Types */}
      <div className="text-xs text-muted-foreground">
        <p className="font-medium mb-1">Allowed file types:</p>
        <p>Images (JPEG, PNG, GIF, WebP), PDF, Text, ZIP</p>
      </div>
    </div>
  );
}
