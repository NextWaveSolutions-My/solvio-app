"use client";

import { useId, useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadResult = {
  success: boolean;
  data?: { url: string; storageKey: string };
  error?: string;
};

type DeleteResult = {
  success: boolean;
  data?: { success: boolean };
  error?: string;
};

interface BrandImageUploaderProps {
  label: string;
  description: string;
  value?: string;
  previewAlt: string;
  uploadLabel: string;
  removeLabel?: string;
  onChange: (url: string) => void;
  uploadAction: (formData: FormData) => Promise<UploadResult>;
  deleteAction: () => Promise<DeleteResult>;
  onSaved?: () => void;
  maxFileSize?: number;
}

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

export function BrandImageUploader({
  label,
  description,
  value,
  previewAlt,
  uploadLabel,
  removeLabel = "Remove",
  onChange,
  uploadAction,
  deleteAction,
  onSaved,
  maxFileSize = 5 * 1024 * 1024,
}: BrandImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const validateFile = (file: File) => {
    if (!allowedImageTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, GIF, WebP, or SVG images are allowed");
      return false;
    }

    if (file.size > maxFileSize) {
      toast.error(
        `File size exceeds ${(maxFileSize / 1024 / 1024).toFixed(0)}MB`
      );
      return false;
    }

    return true;
  };

  const uploadFile = async (file: File) => {
    if (!validateFile(file)) {
      resetInput();
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadAction(formData);

      if (result.success && result.data) {
        onChange(result.data.url);
        onSaved?.();
        toast.success(`${label} uploaded successfully`);
      } else {
        toast.error(result.error || `Failed to upload ${label.toLowerCase()}`);
      }
    } catch {
      toast.error(`An error occurred while uploading ${label.toLowerCase()}`);
    } finally {
      setIsUploading(false);
      resetInput();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void uploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void uploadFile(file);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteAction();

      if (result.success) {
        onChange("");
        onSaved?.();
        toast.success(`${label} removed`);
      } else {
        toast.error(result.error || `Failed to remove ${label.toLowerCase()}`);
      }
    } catch {
      toast.error(`An error occurred while removing ${label.toLowerCase()}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/20 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        {value && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isUploading || isDeleting}
            className="shrink-0"
          >
            {isDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <X className="mr-2 h-4 w-4" />
            )}
            {removeLabel}
          </Button>
        )}
      </div>

      {value && (
        <div className="mt-4 flex h-20 items-center rounded-lg border bg-background/80 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={previewAlt}
            width={200}
            height={50}
            className="max-h-12 max-w-[220px] object-contain"
          />
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={allowedImageTypes.join(",")}
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading || isDeleting}
      />

      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-background/60 px-4 py-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground/30",
          (isUploading || isDeleting) && "pointer-events-none opacity-70"
        )}
      >
        {isUploading ? (
          <Loader2 className="mb-3 h-7 w-7 animate-spin text-muted-foreground" />
        ) : value ? (
          <ImageIcon className="mb-3 h-7 w-7 text-muted-foreground" />
        ) : (
          <Upload className="mb-3 h-7 w-7 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-foreground">
          {isUploading ? "Uploading..." : uploadLabel}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          PNG, JPG, GIF, WebP, SVG up to{" "}
          {(maxFileSize / 1024 / 1024).toFixed(0)}MB
        </span>
      </label>
    </div>
  );
}
