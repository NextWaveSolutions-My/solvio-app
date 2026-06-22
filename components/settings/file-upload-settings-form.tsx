"use client";

import { z } from "zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { updateSettings } from "@/actions/settings";
import { SystemSettings } from "@/types/settings";
import { Loader2, Save, X, Upload, FileType, HardDrive } from "lucide-react";

const fileUploadSettingsSchema = z.object({
  enabled: z.boolean(),
  maxFileSize: z.number().min(1024).max(104857600), // 1KB to 100MB
  maxFilesPerTicket: z.number().min(1).max(20),
  allowedFileTypes: z.array(z.string()),
});

type FileUploadSettingsFormData = z.infer<typeof fileUploadSettingsSchema>;

interface FileUploadSettingsFormProps {
  settings: SystemSettings;
}

const COMMON_FILE_TYPES = [
  { label: "JPEG Images", value: "image/jpeg" },
  { label: "PNG Images", value: "image/png" },
  { label: "GIF Images", value: "image/gif" },
  { label: "WebP Images", value: "image/webp" },
  { label: "PDF Documents", value: "application/pdf" },
  { label: "Text Files", value: "text/plain" },
  { label: "ZIP Archives", value: "application/zip" },
  { label: "ZIP Archives (Alt)", value: "application/x-zip-compressed" },
  {
    label: "Word Documents",
    value:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
  {
    label: "Excel Spreadsheets",
    value: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
];

export function FileUploadSettingsForm({
  settings,
}: FileUploadSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newFileType, setNewFileType] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FileUploadSettingsFormData>({
    resolver: zodResolver(fileUploadSettingsSchema),
    defaultValues: settings.fileUploads,
  });

  const allowedFileTypes = watch("allowedFileTypes");
  const fileUploadsEnabled = watch("enabled");

  const onSubmit = async (data: FileUploadSettingsFormData) => {
    setIsLoading(true);

    try {
      const result = await updateSettings({
        fileUploads: data,
      });

      if (result.success) {
        toast.success("File upload settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred while updating settings");
    } finally {
      setIsLoading(false);
    }
  };

  const addFileType = (fileType: string) => {
    if (fileType && !allowedFileTypes.includes(fileType)) {
      setValue("allowedFileTypes", [...allowedFileTypes, fileType]);
      setNewFileType("");
    }
  };

  const removeFileType = (fileType: string) => {
    setValue(
      "allowedFileTypes",
      allowedFileTypes.filter((type) => type !== fileType)
    );
  };

  return (
    <Card className="overflow-hidden rounded-lg p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-500/10">
            <Upload className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <CardTitle className="text-xl">File Upload Settings</CardTitle>
            <CardDescription className="mt-1">
              Configure file attachment settings for tickets
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Master Toggle */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Upload Service
            </h3>
            <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5">
                <Label
                  htmlFor="enabled"
                  className="text-sm font-medium cursor-pointer"
                >
                  Enable File Uploads
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow customers to attach files to tickets
                </p>
              </div>
              <Switch
                id="enabled"
                checked={watch("enabled")}
                onCheckedChange={(checked) => setValue("enabled", checked)}
              />
            </div>
          </div>

          {/* Upload Limits */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Upload Limits
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Max File Size */}
                <div className="space-y-2">
                  <Label htmlFor="maxFileSize" className="text-sm font-medium">
                    Maximum File Size (MB)
                  </Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    step="0.1"
                    value={(watch("maxFileSize") / 1024 / 1024).toFixed(1)}
                    onChange={(e) => {
                      const mb = parseFloat(e.target.value);
                      setValue("maxFileSize", Math.round(mb * 1024 * 1024));
                    }}
                    disabled={!fileUploadsEnabled}
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    1 MB to 100 MB per file
                  </p>
                  {errors.maxFileSize && (
                    <p className="text-sm text-destructive">
                      {errors.maxFileSize.message}
                    </p>
                  )}
                </div>

                {/* Max Files Per Ticket */}
                <div className="space-y-2">
                  <Label
                    htmlFor="maxFilesPerTicket"
                    className="text-sm font-medium"
                  >
                    Max Files Per Ticket
                  </Label>
                  <Input
                    id="maxFilesPerTicket"
                    type="number"
                    {...register("maxFilesPerTicket", { valueAsNumber: true })}
                    disabled={!fileUploadsEnabled}
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    1-20 files per ticket
                  </p>
                  {errors.maxFilesPerTicket && (
                    <p className="text-sm text-destructive">
                      {errors.maxFilesPerTicket.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Allowed File Types */}
          <div className="space-y-4 mb-0">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileType className="h-4 w-4" />
              Allowed File Types
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
              <div className="flex gap-2">
                <select
                  className="flex h-11 w-full rounded-lg border border-input/50 bg-background/80 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  value={newFileType}
                  onChange={(e) => setNewFileType(e.target.value)}
                  disabled={!fileUploadsEnabled}
                >
                  <option value="">Select a file type...</option>
                  {COMMON_FILE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addFileType(newFileType)}
                  disabled={!newFileType || !fileUploadsEnabled}
                  className="h-11 px-5"
                >
                  Add
                </Button>
              </div>

              {/* Display allowed file types */}
              <div className="flex flex-wrap gap-2">
                {allowedFileTypes.map((fileType) => (
                  <Badge
                    key={fileType}
                    variant="secondary"
                    className="gap-1 py-1.5 px-3 bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <span className="max-w-[200px] truncate text-xs">
                      {COMMON_FILE_TYPES.find((t) => t.value === fileType)
                        ?.label || fileType}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFileType(fileType)}
                      className="ml-1 hover:text-destructive transition-colors"
                      disabled={!fileUploadsEnabled}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {allowedFileTypes.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No file types allowed. Add at least one file type.
                </p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end py-6">
            <Button
              type="submit"
              disabled={isLoading}
              className="h-11 px-6 shadow-md hover:shadow-lg transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
