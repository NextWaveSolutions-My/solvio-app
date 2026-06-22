"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TimezoneSelect } from "@/components/ui/timezone-select";
import { Loader2, Save, Settings } from "lucide-react";
import { SystemSettings } from "@/types/settings";
import {
  deleteLogo,
  deleteLogoDark,
  updateSettings,
  uploadLogo,
  uploadLogoDark,
} from "@/actions/settings";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { BrandImageUploader } from "@/components/settings/brand-image-uploader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const generalSettingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  siteDescription: z.string().min(1, "Site description is required"),
  supportEmail: z.string().email("Invalid email address"),
  companyName: z.string().min(1, "Company name is required"),
  timezone: z.string().min(1, "Timezone is required"),
  dateFormat: z.string().min(1, "Date format is required"),
  timeFormat: z.enum(["12h", "24h"]),
});

type GeneralSettingsFormData = z.infer<typeof generalSettingsSchema>;

interface GeneralSettingsFormProps {
  settings: SystemSettings;
}

export function GeneralSettingsForm({ settings }: GeneralSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(settings.appearance.logoUrl || "");
  const [logoDarkUrl, setLogoDarkUrl] = useState(
    settings.appearance.logoDarkUrl || ""
  );
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<GeneralSettingsFormData>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: settings.general,
  });

  const timeFormat = watch("timeFormat");

  const onSubmit = async (data: GeneralSettingsFormData) => {
    setIsLoading(true);

    try {
      const result = await updateSettings({
        general: data,
      });

      if (result.success) {
        router.refresh();
        toast.success("General settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch {
      toast.error("An error occurred while updating settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-md p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">General Settings</CardTitle>
            <CardDescription className="mt-1">
              Configure basic information about your support system
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Site Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Site Information
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5 space-y-5">
              {/* Site Name */}
              <div className="space-y-2">
                <Label htmlFor="siteName" className="text-sm font-medium">
                  Site Name
                </Label>
                <Input
                  id="siteName"
                  {...register("siteName")}
                  placeholder="Support Ticket System"
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
                {errors.siteName && (
                  <p className="text-sm text-destructive">
                    {errors.siteName.message}
                  </p>
                )}
              </div>

              {/* Site Description */}
              <div className="space-y-2">
                <Label
                  htmlFor="siteDescription"
                  className="text-sm font-medium"
                >
                  Site Description
                </Label>
                <Textarea
                  id="siteDescription"
                  {...register("siteDescription")}
                  placeholder="Customer support and ticket management"
                  rows={3}
                  className="bg-background/80 border-input/50 focus:border-primary transition-colors resize-none"
                />
                {errors.siteDescription && (
                  <p className="text-sm text-destructive">
                    {errors.siteDescription.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Brand Assets Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Brand Assets
            </h3>
            <div className="grid gap-5 xl:grid-cols-2">
              <BrandImageUploader
                label="Light Mode Logo"
                description="Used on light backgrounds across public pages and app sidebars."
                value={logoUrl}
                previewAlt="Light mode logo preview"
                uploadLabel="Click to upload or drag and drop"
                uploadAction={uploadLogo}
                deleteAction={deleteLogo}
                onChange={setLogoUrl}
                onSaved={() => router.refresh()}
              />
              <BrandImageUploader
                label="Dark Mode Logo"
                description="Used automatically when the interface is in dark mode."
                value={logoDarkUrl}
                previewAlt="Dark mode logo preview"
                uploadLabel="Click to upload or drag and drop"
                uploadAction={uploadLogoDark}
                deleteAction={deleteLogoDark}
                onChange={setLogoDarkUrl}
                onSaved={() => router.refresh()}
              />
            </div>
          </div>

          {/* Company Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Company Information
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium">
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    {...register("companyName")}
                    placeholder="Your Company"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  {errors.companyName && (
                    <p className="text-sm text-destructive">
                      {errors.companyName.message}
                    </p>
                  )}
                </div>

                {/* Support Email */}
                <div className="space-y-2">
                  <Label htmlFor="supportEmail" className="text-sm font-medium">
                    Support Email
                  </Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    {...register("supportEmail")}
                    placeholder="support@example.com"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  {errors.supportEmail && (
                    <p className="text-sm text-destructive">
                      {errors.supportEmail.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Regional Settings Section */}
          <div className="space-y-4 mb-0">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Regional Settings
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5 space-y-5">
              {/* Timezone */}
              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm font-medium">
                  Timezone
                </Label>
                <TimezoneSelect
                  value={watch("timezone")}
                  onValueChange={(value) => setValue("timezone", value)}
                />
                {errors.timezone && (
                  <p className="text-sm text-destructive">
                    {errors.timezone.message}
                  </p>
                )}
              </div>

              {/* Date & Time Format */}
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Date Format */}
                <div className="space-y-2">
                  <Label htmlFor="dateFormat" className="text-sm font-medium">
                    Date Format
                  </Label>
                  <Select
                    value={watch("dateFormat")}
                    onValueChange={(value) => setValue("dateFormat", value)}
                  >
                    <SelectTrigger className="h-11 bg-background/80 border-input/50">
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MMM dd, yyyy">Jan 01, 2024</SelectItem>
                      <SelectItem value="dd/MM/yyyy">01/01/2024</SelectItem>
                      <SelectItem value="MM/dd/yyyy">01/01/2024</SelectItem>
                      <SelectItem value="yyyy-MM-dd">2024-01-01</SelectItem>
                      <SelectItem value="dd MMM yyyy">01 Jan 2024</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.dateFormat && (
                    <p className="text-sm text-destructive">
                      {errors.dateFormat.message}
                    </p>
                  )}
                </div>

                {/* Time Format */}
                <div className="space-y-2">
                  <Label htmlFor="timeFormat" className="text-sm font-medium">
                    Time Format
                  </Label>
                  <Select
                    value={timeFormat}
                    onValueChange={(value: "12h" | "24h") =>
                      setValue("timeFormat", value)
                    }
                  >
                    <SelectTrigger className="h-11 bg-background/80 border-input/50">
                      <SelectValue placeholder="Select time format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                      <SelectItem value="24h">24-hour (14:30)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.timeFormat && (
                    <p className="text-sm text-destructive">
                      {errors.timeFormat.message}
                    </p>
                  )}
                </div>
              </div>
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
