"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getClientUsers } from "@/actions/admin";
import { adminCreateTicket } from "@/actions/admin";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { adminCreateTicketSchema } from "@/lib/validations";
import type { AdminCreateTicketFormData, User } from "@/types";
import { uploadTicketAttachments } from "@/actions/attachments";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Loader2, Wrench, AlertCircle, Search, Users } from "lucide-react";
import { FileUploadPreview } from "@/components/attachments/file-upload-preview";

type ClientUser = User & {
  ticketCount: number;
  openTickets: number;
  resolvedTickets: number;
  lastTicketDate?: Date;
};

export default function AdminNewCustomizationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [customers, setCustomers] = useState<ClientUser[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdminCreateTicketFormData>({
    resolver: zodResolver(adminCreateTicketSchema),
    defaultValues: {
      priority: "medium",
      category: "feature_request",
    },
  });

  const priority = watch("priority");
  const timezone = watch("timezone");
  const customerId = watch("customerId");

  // Fetch customers on mount
  useEffect(() => {
    async function loadCustomers() {
      setIsLoadingCustomers(true);
      const result = await getClientUsers();
      if (result.success && result.data) {
        setCustomers(result.data);
      }
      setIsLoadingCustomers(false);
    }
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(
    (c) =>
      c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const onSubmit = async (data: AdminCreateTicketFormData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await adminCreateTicket({
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

      router.push(`/admin/customization/${ticketId}`);
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
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between pb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-foreground">
                Create Customization Request
              </h1>
              <span className="text-muted-foreground">•</span>
              <nav className="text-sm text-muted-foreground flex items-center">
                <Link
                  href="/admin"
                  className="hover:text-foreground transition-colors"
                >
                  Admin
                </Link>
                <span className="mx-2">•</span>
                <Link
                  href="/admin/customization"
                  className="hover:text-foreground transition-colors"
                >
                  Customization
                </Link>
                <span className="mx-2">•</span>
                <span className="text-foreground">New Request</span>
              </nav>
            </div>
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full" />
              <div className="absolute inset-2 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center">
                <Wrench className="w-8 h-8 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {/* Customer Selection - Admin Only */}
              <div className="bg-background rounded-xl border p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Select Customer</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose which customer this request is for
                </p>

                {isLoadingCustomers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3 items-center">
                      <div className="relative col-span-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search customers..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>

                      <Select
                        value={customerId}
                        onValueChange={(value) => setValue("customerId", value)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className="h-11 min-h-11 w-full">
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCustomers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {customer.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {customer.email}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                          {filteredCustomers.length === 0 && (
                            <div className="py-4 text-center text-muted-foreground text-sm">
                              No customers found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCustomer && (
                      <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm font-medium">
                          {selectedCustomer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedCustomer.email} •{" "}
                          {selectedCustomer.ticketCount} tickets
                        </p>
                      </div>
                    )}

                    {errors.customerId && (
                      <p className="text-sm text-destructive">
                        {errors.customerId.message}
                      </p>
                    )}
                  </>
                )}
              </div>

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
                    placeholder="Describe the customization requirements..."
                    {...register("description")}
                    disabled={isSubmitting}
                    className="resize-none placeholder:text-muted-foreground/50 min-h-[120px]"
                  />
                  <p className="text-xs text-muted-foreground">
                    The more details you provide, the better we can understand
                    and estimate the customization request.
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
                    explain the customization needs
                  </p>
                  <FileUploadPreview
                    onFilesChange={handleFilesChange}
                    disabled={isSubmitting}
                    maxFiles={5}
                    maxFileSize={20971520}
                  />
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
                      Optional product details for the customization request
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
                      placeholder="Enter Envato purchase code"
                      {...register("purchaseCode")}
                      disabled={isSubmitting}
                      className="h-11 font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the Envato purchase code if applicable
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
                  Set the timezone for scheduling meetings or calls.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="bg-background rounded-xl border p-6 space-y-3">
                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={isSubmitting || !customerId}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Request"
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
