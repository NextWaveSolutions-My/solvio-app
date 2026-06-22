"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Briefcase, Download, Plus, Wrench } from "lucide-react";
import { toast } from "sonner";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { FileUploadPreview } from "@/components/attachments/file-upload-preview";
import { cn } from "@/lib/utils";
import { getClientUsers } from "@/actions/admin";
import { uploadTicketAttachments } from "@/actions/attachments";
import { createServiceRequestForStaff } from "@/actions/service-requests";
import { getServiceBySlug } from "@/actions/services";
import type { User } from "@/types";

type ClientUser = User & {
  ticketCount: number;
  openTickets: number;
  resolvedTickets: number;
  lastTicketDate?: Date;
};

type FormData = {
  customerId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  productName?: string;
  productVersion?: string;
  purchaseCode?: string;
  timezone?: string;
};

function iconForKey(iconKey: string) {
  switch (iconKey) {
    case "wrench":
      return Wrench;
    case "download":
      return Download;
    default:
      return Briefcase;
  }
}

export default function AdminNewServiceRequestPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [serviceName, setServiceName] = useState("Service");
  const [serviceIconKey, setServiceIconKey] = useState("briefcase");
  const [customers, setCustomers] = useState<ClientUser[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [customerSearch, setCustomerSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const Icon = useMemo(() => iconForKey(serviceIconKey), [serviceIconKey]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      priority: "medium",
      customerId: "",
    },
  });

  const priority = watch("priority");
  const timezone = watch("timezone");
  const customerId = watch("customerId");
  const shouldShowProductFields = slug === "customization" || slug === "installation";

  useEffect(() => {
    async function init() {
      const { slug } = await params;
      setSlug(slug);
      const serviceResult = await getServiceBySlug(slug);
      if (serviceResult.success && serviceResult.data) {
        setServiceName(serviceResult.data.name);
        setServiceIconKey(serviceResult.data.iconKey || "briefcase");
      }
    }
    init();
  }, [params]);

  useEffect(() => {
    async function loadCustomers() {
      setIsLoadingCustomers(true);
      const result = await getClientUsers();
      if (result.success && result.data) {
        setCustomers(result.data as ClientUser[]);
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

  const handleFilesChange = (files: File[]) => {
    setSelectedFiles(files);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await createServiceRequestForStaff(slug, data);
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
      router.push(`/admin/services/${slug}/${ticketId}`);
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "An unexpected error occurred";
      setError(message);
      toast.error(message);
      setIsSubmitting(false);
    }
  };

  const priorities = [
    { value: "low", label: "Low", color: "bg-slate-400" },
    { value: "medium", label: "Medium", color: "bg-blue-500" },
    { value: "high", label: "High", color: "bg-amber-500" },
    { value: "urgent", label: "Urgent", color: "bg-red-500" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between sm:pb-6">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground sm:text-xl">
                Create {serviceName} Request
              </h1>
              <nav className="mt-1 hidden items-center text-sm text-muted-foreground sm:flex">
                <Link href="/admin" className="hover:text-foreground transition-colors">
                  Admin
                </Link>
                <span className="mx-2">•</span>
                <Link
                  href={`/admin/services/${slug}`}
                  className="hover:text-foreground transition-colors"
                >
                  {serviceName}
                </Link>
                <span className="mx-2">•</span>
                <span className="text-foreground">New Request</span>
              </nav>
            </div>
            <div className="relative h-16 w-16 self-start sm:h-20 sm:w-20 sm:self-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full" />
              <div className="absolute inset-2 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full flex items-center justify-center">
                <Icon className="h-6 w-6 text-primary sm:h-8 sm:w-8" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="space-y-4 rounded-xl border bg-background p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Select Customer</h2>
                <Input
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="h-11"
                />
                <Select
                  value={customerId}
                  onValueChange={(value) => setValue("customerId", value)}
                  disabled={isLoadingCustomers || isSubmitting}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder={isLoadingCustomers ? "Loading..." : "Select customer"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.customerId && (
                  <p className="text-sm text-destructive">{errors.customerId.message}</p>
                )}
              </div>

              <div className="space-y-6 rounded-xl border bg-background p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Request Details</h2>

                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" {...register("title", { required: true })} className="h-11" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description", { required: true })}
                    className="min-h-[140px]"
                  />
                </div>

                {shouldShowProductFields && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="productName">Product Name</Label>
                        <Input
                          id="productName"
                          {...register("productName")}
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="productVersion">Product Version</Label>
                        <Input
                          id="productVersion"
                          {...register("productVersion")}
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="purchaseCode">Purchase Code</Label>
                      <Input
                        id="purchaseCode"
                        {...register("purchaseCode")}
                        className="h-11"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4 rounded-xl border bg-background p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Attachments</h2>
                <FileUploadPreview onFilesChange={handleFilesChange} />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4 rounded-xl border bg-background p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Priority</h2>
                <Select
                  value={priority}
                  onValueChange={(value) => setValue("priority", value as FormData["priority"])}
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
              </div>

              <div className="space-y-4 rounded-xl border bg-background p-4 sm:p-6">
                <h2 className="text-lg font-semibold">Timezone</h2>
                <TimezoneSelect value={timezone} onValueChange={(value) => setValue("timezone", value)} />
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
                <Button type="button" variant="outline" asChild className="h-11">
                  <Link href={`/admin/services/${slug}`}>Cancel</Link>
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
