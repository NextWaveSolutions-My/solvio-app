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

export default function EditCustomizationPage({
  params,
}: EditCustomizationPageProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticketId, setTicketId] = useState<string>("");

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

  // Load ticket data
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
          notFound();
        }

        // Pre-populate form
        setValue("title", ticket.title);
        setValue("description", ticket.description);
        setValue("priority", ticket.priority);
        setValue("productName", ticket.productName || "");
        setValue("productVersion", ticket.productVersion || "");

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading ticket:", error);
        setError("Failed to load customization request");
        setIsLoading(false);
      }
    }

    loadTicket();
  }, [params, setValue]);

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
      router.push(`/dashboard/customization/${ticketId}`);
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
      <div className="flex justify-between items-center">
        <div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold">Edit Customization Request</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Update your customization request details
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/dashboard/customization/${ticketId}`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Details
          </Link>
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Customization Details</CardTitle>
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
                Customization Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Add dark mode support, Custom payment gateway integration"
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
                Detailed Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Please provide detailed information about your customization needs..."
                rows={10}
                {...register("description")}
                disabled={isSubmitting}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                The more details you provide, the better we can understand and
                estimate your customization request.
              </p>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">
                Priority <span className="text-destructive">*</span>
              </Label>
              <Select
                value={priority}
                onValueChange={(value) => setValue("priority", value as any)}
                disabled={isSubmitting}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - No rush</SelectItem>
                  <SelectItem value="medium">
                    Medium - Standard timeline
                  </SelectItem>
                  <SelectItem value="high">High - Need it soon</SelectItem>
                  <SelectItem value="urgent">
                    Urgent - Critical for business
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && (
                <p className="text-sm text-destructive">
                  {errors.priority.message}
                </p>
              )}
            </div>

            {/* Product Information */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold">Product Information (Optional)</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    placeholder="e.g., My Awesome Plugin"
                    {...register("productName")}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productVersion">Product Version</Label>
                  <Input
                    id="productVersion"
                    placeholder="e.g., 1.0.0"
                    {...register("productVersion")}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
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
    </div>
  );
}
