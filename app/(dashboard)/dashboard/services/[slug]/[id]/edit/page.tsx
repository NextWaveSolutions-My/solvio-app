"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateInstallationSchema } from "@/lib/validations";
import { getTicketById } from "@/actions/tickets";
import { updateServiceContent } from "@/actions/service-requests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { notFound } from "next/navigation";
import { getServiceBySlug } from "@/actions/services";
import type { Ticket } from "@/types";

interface EditServiceRequestPageProps {
  params: Promise<{ slug: string; id: string }>;
}

interface ServiceRequestFormData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  productName?: string;
  productVersion?: string;
}

export default function EditServiceRequestPage({ params }: EditServiceRequestPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticketId, setTicketId] = useState("");
  const [serviceSlug, setServiceSlug] = useState("");
  const [serviceName, setServiceName] = useState("Service");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ServiceRequestFormData>({
    resolver: zodResolver(updateInstallationSchema),
  });

  const priority = watch("priority");

  useEffect(() => {
    async function load() {
      try {
        const resolved = await params;
        setTicketId(resolved.id);
        setServiceSlug(resolved.slug);

        const serviceResult = await getServiceBySlug(resolved.slug);
        if (serviceResult.success && serviceResult.data) {
          setServiceName(serviceResult.data.name);
        }

        const result = await getTicketById(resolved.id);
        if (!result.success || !result.data) {
          notFound();
        }

        const ticket = result.data as unknown as Ticket;
        const isMatchingService =
          (ticket.category === "service" && ticket.serviceSlug === resolved.slug) ||
          (resolved.slug === "customization" && ticket.category === "feature_request") ||
          (resolved.slug === "installation" && ticket.category === "technical_support");
        if (!isMatchingService) notFound();

        setValue("title", ticket.title);
        setValue("description", ticket.description);
        setValue("priority", ticket.priority);
        setValue("productName", ticket.productName || "");
        setValue("productVersion", ticket.productVersion || "");

        setIsLoading(false);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to load request";
        setError(message);
        setIsLoading(false);
      }
    }

    load();
  }, [params, setValue]);

  const onSubmit = async (data: ServiceRequestFormData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await updateServiceContent(ticketId, serviceSlug, data);

      if (!result.success) {
        setError(result.error || "Failed to update request");
        toast.error(result.error || "Failed to update request");
        setIsSubmitting(false);
        return;
      }

      toast.success("Request updated successfully!");
      router.push(`/dashboard/services/${serviceSlug}/${ticketId}`);
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Loading...</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/services/${serviceSlug}/${ticketId}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Edit {serviceName} Request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} disabled={isSubmitting} />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                disabled={isSubmitting}
                className="min-h-[140px]"
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setValue("priority", value as ServiceRequestFormData["priority"])
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.priority && (
                  <p className="text-sm text-destructive">{errors.priority.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input id="productName" {...register("productName")} disabled={isSubmitting} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productVersion">Product Version</Label>
                <Input
                  id="productVersion"
                  {...register("productVersion")}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
