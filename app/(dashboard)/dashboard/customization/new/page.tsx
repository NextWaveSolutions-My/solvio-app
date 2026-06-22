"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createTicket } from "@/actions/tickets";
import type { CreateTicketFormData } from "@/types";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTicketSchema } from "@/lib/validations";
import { uploadTicketAttachments } from "@/actions/attachments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { FileUploadPreview } from "@/components/attachments/file-upload-preview";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { cn } from "@/lib/utils";

export default function NewCustomizationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      priority: "medium",
      category: "feature_request",
    },
  });

  const priority = watch("priority");
  const timezone = watch("timezone");

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const onSubmit = async (data: CreateTicketFormData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await createTicket({
        ...data,
        category: "feature_request",
      });

      if (!result.success) {
        setError(result.error || "Failed to create customization request");
        toast.error(result.error || "Failed to create customization request");
        setIsSubmitting(false);
        return;
      }

      const ticketId = result.data?._id.toString();

      if (selectedFiles.length > 0 && ticketId) {
        const formData = new FormData();
        selectedFiles.forEach((file, index) => {
          formData.append(`file_${index}`, file);
        });

        const uploadResult = await uploadTicketAttachments(ticketId, formData);

        if (!uploadResult.success) {
          toast.warning(
            `Request created but some files failed to upload: ${uploadResult.error}`
          );
        } else if (uploadResult.data && uploadResult.data.length > 0) {
          toast.success(
            `Customization request created with ${uploadResult.data.length} attachment(s)!`
          );
        } else {
          toast.success("Customization request created successfully!");
        }
      } else {
        toast.success("Customization request created successfully!");
      }

      router.push(`/dashboard/customization/${ticketId}`);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An unexpected error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const priorities = [
    { value: "low", label: "Low - No rush", color: "bg-slate-400" },
    {
      value: "medium",
      label: "Medium - Standard timeline",
      color: "bg-blue-500",
    },
    { value: "high", label: "High - Need it soon", color: "bg-amber-500" },
    {
      value: "urgent",
      label: "Urgent - Critical for business",
      color: "bg-red-500",
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-1.5 py-5">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link
                href="/dashboard"
                className="hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <Link
                href="/dashboard/customization"
                className="hover:text-foreground transition-colors"
              >
                Customization
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">New Request</span>
            </nav>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Request Customization
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form id="customization-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* General Section */}
              <div className="bg-background rounded-xl border p-6 space-y-6">
                <h2 className="text-lg font-semibold">Customization Details</h2>

                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Customization Title{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter customization request title"
                    {...register("title")}
                    disabled={isSubmitting}
                    className="h-11 placeholder:text-muted-foreground/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    A title is required and recommended to be unique.
                  </p>
                  {errors.title && (
                    <p className="text-sm text-destructive">
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Detailed Description{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your customization requirements..."
                    {...register("description")}
                    disabled={isSubmitting}
                    className="resize-none placeholder:text-muted-foreground/50 min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    The more details you provide, the better we can understand
                    and estimate your customization request.
                  </p>
                  {errors.description && (
                    <p className="text-sm text-destructive">
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Attachments Section */}
              {process.env.NEXT_PUBLIC_FILE_UPLOADS_ENABLED === "true" && (
                <div className="bg-background rounded-xl border p-6 space-y-4">
                  <h2 className="text-lg font-semibold">Attachments</h2>
                  <p className="text-xs text-muted-foreground">
                    Upload mockups, wireframes, examples, or any files that help
                    explain your customization needs
                  </p>
                  <FileUploadPreview
                    onFilesChange={handleFilesChange}
                    disabled={isSubmitting}
                    maxFiles={5}
                    maxFileSize={20971520}
                  />
                  <p className="text-xs text-muted-foreground">Files :</p>
                </div>
              )}

              {/* Product Information */}
              {process.env.NEXT_PUBLIC_PURCHASE_CODE_VALIDATION_ENABLED ===
                "true" && (
                <div className="bg-background rounded-xl border p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold">
                      Product Information
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Optional product details for your customization request
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name</Label>
                      <Input
                        id="productName"
                        placeholder="e.g., My Awesome Plugin"
                        {...register("productName")}
                        disabled={isSubmitting}
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="productVersion">Product Version</Label>
                      <Input
                        id="productVersion"
                        placeholder="e.g., 1.0.0"
                        {...register("productVersion")}
                        disabled={isSubmitting}
                        className="h-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaseCode">Purchase Code</Label>
                    <Input
                      id="purchaseCode"
                      placeholder="Enter your Envato purchase code"
                      {...register("purchaseCode")}
                      disabled={isSubmitting}
                      className="h-11 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your Envato purchase code if applicable
                    </p>
                    {errors.purchaseCode && (
                      <p className="text-sm text-destructive">
                        {errors.purchaseCode.message}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Priority */}
              <div className="bg-background rounded-xl border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Priority</h2>
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      priority === "low" && "bg-slate-400",
                      priority === "medium" && "bg-blue-500",
                      priority === "high" && "bg-amber-500",
                      priority === "urgent" && "bg-red-500"
                    )}
                  />
                </div>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setValue(
                      "priority",
                      value as "low" | "medium" | "high" | "urgent"
                    )
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn("h-2 w-2 rounded-full", p.color)}
                          />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Set the customization priority.
                </p>
                {errors.priority && (
                  <p className="text-sm text-destructive">
                    {errors.priority.message}
                  </p>
                )}
              </div>

              {/* Timezone */}
              <div className="bg-background rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Timezone</h2>
                <TimezoneSelect
                  value={timezone}
                  onValueChange={(value) => setValue("timezone", value)}
                  disabled={isSubmitting}
                  placeholder="Select timezone"
                />
                <p className="text-xs text-muted-foreground">
                  Set your timezone for scheduling meetings or calls.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="bg-background rounded-xl border p-6 space-y-3">
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
