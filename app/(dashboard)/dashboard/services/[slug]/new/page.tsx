"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import {
  AlertCircle,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { FileUploadPreview } from "@/components/attachments/file-upload-preview";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { cn } from "@/lib/utils";
import { createServiceRequest } from "@/actions/service-requests";
import { getServiceBySlug } from "@/actions/services";

const serviceRequestSchema = createTicketSchema.omit({ category: true });
type ServiceRequestFormData = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  productName?: string;
  productVersion?: string;
  purchaseCode?: string;
  timezone?: string;
};

export default function NewDashboardServiceRequestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [serviceName, setServiceName] = useState("Service");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceRequestFormData>({
    resolver: zodResolver(serviceRequestSchema),
    defaultValues: {
      priority: "medium",
    },
  });

  const priority = watch("priority");
  const timezone = watch("timezone");
  const shouldShowProductFields = slug === "customization" || slug === "installation";

  useEffect(() => {
    async function init() {
      const { slug } = await params;
      setSlug(slug);
      const serviceResult = await getServiceBySlug(slug);
      if (serviceResult.success && serviceResult.data) {
        setServiceName(serviceResult.data.name);
      }
    }
    init();
  }, [params]);

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const onSubmit = async (data: ServiceRequestFormData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await createServiceRequest(slug, data);

      if (!result.success || !result.data) {
        setError(result.error || "Failed to create request");
        toast.error(result.error || "Failed to create request");
        setIsSubmitting(false);
        return;
      }

      const rawId = (result.data as { _id?: unknown } | undefined)?._id;
      const ticketId = typeof rawId === "string" ? rawId : rawId ? String(rawId) : "";

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
        }
      }

      toast.success("Request created successfully!");
      router.push(`/dashboard/services/${slug}/${ticketId}`);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "An unexpected error occurred";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  const priorities = [
    { value: "low", label: "Low - No rush", color: "bg-slate-400" },
    { value: "medium", label: "Medium - Standard timeline", color: "bg-blue-500" },
    { value: "high", label: "High - Need it soon", color: "bg-amber-500" },
    { value: "urgent", label: "Urgent - Critical, ASAP", color: "bg-red-500" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-1.5 py-5">
            <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <Link
                href={`/dashboard/services/${slug}`}
                className="hover:text-foreground transition-colors"
              >
                {serviceName}
              </Link>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">New Request</span>
            </nav>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              New {serviceName} Request
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form id="service-request-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-background rounded-xl border p-6 space-y-6">
                <h2 className="text-lg font-semibold">Request Details</h2>

                <div className="space-y-2">
                  <Label htmlFor="title">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter request title"
                    {...register("title")}
                    disabled={isSubmitting}
                    className="h-11 placeholder:text-muted-foreground/50"
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you need..."
                    {...register("description")}
                    disabled={isSubmitting}
                    className="resize-none placeholder:text-muted-foreground/50 min-h-[120px]"
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description.message}</p>
                  )}
                </div>

                {shouldShowProductFields && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="productName">Product Name</Label>
                      <Input
                        id="productName"
                        placeholder="e.g. Solvio"
                        {...register("productName")}
                        disabled={isSubmitting}
                        className="h-11 placeholder:text-muted-foreground/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productVersion">Product Version</Label>
                      <Input
                        id="productVersion"
                        placeholder="e.g. 1.0.0"
                        {...register("productVersion")}
                        disabled={isSubmitting}
                        className="h-11 placeholder:text-muted-foreground/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purchaseCode">Purchase Code</Label>
                      <Input
                        id="purchaseCode"
                        placeholder="Optional"
                        {...register("purchaseCode")}
                        disabled={isSubmitting}
                        className="h-11 placeholder:text-muted-foreground/50"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="bg-background rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Attachments</h2>
                <FileUploadPreview onFilesChange={handleFilesChange} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-background rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Priority</h2>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setValue("priority", value as ServiceRequestFormData["priority"])
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
                          <div className={cn("w-2 h-2 rounded-full", p.color)} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-destructive">{errors.priority.message}</p>
                )}
              </div>

              <div className="bg-background rounded-xl border p-6 space-y-4">
                <h2 className="text-lg font-semibold">Timezone</h2>
                <TimezoneSelect
                  value={timezone}
                  onValueChange={(value) => setValue("timezone", value)}
                />
              </div>

              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={isSubmitting} className="h-11">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Request
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  asChild
                  className="h-11"
                >
                  <Link href={`/dashboard/services/${slug}`}>Cancel</Link>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
