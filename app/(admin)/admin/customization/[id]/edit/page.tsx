"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateCustomizationSchema } from "@/lib/validations";
import { updateCustomizationContent, getTicketById } from "@/actions/tickets";
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

interface EditCustomizationPageProps {
  params: Promise<{ id: string }>;
}

interface CustomizationFormData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  productName?: string;
  productVersion?: string;
}

export default function AdminEditCustomizationPage({
  params,
}: EditCustomizationPageProps) {
  const router = useRouter();
  const [ticketId, setTicketId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomizationFormData>({
    resolver: zodResolver(updateCustomizationSchema),
  });

  const priority = watch("priority");

  useEffect(() => {
    async function loadTicket() {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        setTicketId(id);

        const result = await getTicketById(id);

        if (!result.success || !result.data) {
          notFound();
        }

        const ticket = result.data;

        // Verify it's a customization request
        if (ticket.category !== "feature_request") {
          router.push(`/admin/tickets/${id}`);
          return;
        }

        // Populate form
        setValue("title", ticket.title);
        setValue("description", ticket.description);
        setValue("priority", ticket.priority);
        setValue("productName", ticket.productName || "");
        setValue("productVersion", ticket.productVersion || "");

        setIsLoading(false);
      } catch (error: any) {
        console.error("Error loading ticket:", error);
        setError("Failed to load customization request");
        setIsLoading(false);
      }
    }

    loadTicket();
  }, [params, router, setValue]);

  const onSubmit = async (data: CustomizationFormData) => {
    setIsSubmitting(true);
    setError("");

    try {
      const result = await updateCustomizationContent(ticketId, data);

      if (!result.success) {
        setError(result.error || "Failed to update customization request");
        toast.error(result.error || "Failed to update customization request");
        setIsSubmitting(false);
        return;
      }

      toast.success("Customization request updated successfully!");
      router.push(`/admin/customization/${ticketId}`);
      router.refresh();
    } catch (error: any) {
      setError(error.message || "An unexpected error occurred");
      toast.error(error.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold">Edit Customization Request</h1>
          </div>
          <p className="text-muted-foreground">
            Update the customization request details
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/admin/customization/${ticketId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Brief description of the customization"
                {...register("title")}
                disabled={isSubmitting}
              />
              {errors.title && (
                <p className="text-sm text-destructive">
                  {errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Detailed description of what you need customized..."
                rows={8}
                {...register("description")}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select
                value={priority}
                onValueChange={(value) =>
                  setValue("priority", value as any, { shouldValidate: true })
                }
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-destructive">
                  {errors.priority.message}
                </p>
              )}
            </div>

            {/* Product Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  placeholder="e.g., PropertyPro"
                  {...register("productName")}
                  disabled={isSubmitting}
                />
                {errors.productName && (
                  <p className="text-sm text-destructive">
                    {errors.productName.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="productVersion">Product Version</Label>
                <Input
                  id="productVersion"
                  placeholder="e.g., 2.1.0"
                  {...register("productVersion")}
                  disabled={isSubmitting}
                />
                {errors.productVersion && (
                  <p className="text-sm text-destructive">
                    {errors.productVersion.message}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/admin/customization/${ticketId}`)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
