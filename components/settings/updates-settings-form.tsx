"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SystemSettings } from "@/types/settings";
import { updateSettings } from "@/actions/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";

const updatesSettingsSchema = z.object({
  announcementsEnabled: z.boolean(),
  announcementTitle: z.string().max(60),
  announcementMessage: z.string().max(500),
  announcementVariant: z.enum(["info", "success", "warning", "maintenance"]),
  announcementDismissible: z.boolean(),
  showOnPublic: z.boolean(),
  showOnDashboard: z.boolean(),
  showOnAdmin: z.boolean(),
  showOnSupport: z.boolean(),
  maintenanceEnabled: z.boolean(),
  maintenanceMessage: z.string().max(500),
  allowAdmin: z.boolean(),
  allowSupport: z.boolean(),
});

type UpdatesSettingsFormData = z.infer<typeof updatesSettingsSchema>;

export function UpdatesSettingsForm({ settings }: { settings: SystemSettings }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const {
    setValue,
    watch,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdatesSettingsFormData>({
    resolver: zodResolver(updatesSettingsSchema),
    defaultValues: {
      announcementsEnabled: settings.announcements?.enabled ?? false,
      announcementTitle: settings.announcements?.title ?? "What’s new",
      announcementMessage: settings.announcements?.message ?? "",
      announcementVariant: settings.announcements?.variant ?? "info",
      announcementDismissible: settings.announcements?.dismissible ?? true,
      showOnPublic: settings.announcements?.showOn?.public ?? false,
      showOnDashboard: settings.announcements?.showOn?.dashboard ?? true,
      showOnAdmin: settings.announcements?.showOn?.admin ?? true,
      showOnSupport: settings.announcements?.showOn?.support ?? true,
      maintenanceEnabled: settings.maintenance?.enabled ?? false,
      maintenanceMessage:
        settings.maintenance?.message ??
        "We’re performing maintenance right now. Please check back soon.",
      allowAdmin: settings.maintenance?.allowAdmin ?? true,
      allowSupport: settings.maintenance?.allowSupport ?? true,
    },
  });

  useEffect(() => {
    reset({
      announcementsEnabled: settings.announcements?.enabled ?? false,
      announcementTitle: settings.announcements?.title ?? "What’s new",
      announcementMessage: settings.announcements?.message ?? "",
      announcementVariant: settings.announcements?.variant ?? "info",
      announcementDismissible: settings.announcements?.dismissible ?? true,
      showOnPublic: settings.announcements?.showOn?.public ?? false,
      showOnDashboard: settings.announcements?.showOn?.dashboard ?? true,
      showOnAdmin: settings.announcements?.showOn?.admin ?? true,
      showOnSupport: settings.announcements?.showOn?.support ?? true,
      maintenanceEnabled: settings.maintenance?.enabled ?? false,
      maintenanceMessage:
        settings.maintenance?.message ??
        "We’re performing maintenance right now. Please check back soon.",
      allowAdmin: settings.maintenance?.allowAdmin ?? true,
      allowSupport: settings.maintenance?.allowSupport ?? true,
    });
  }, [reset, settings]);

  const announcementsEnabled = watch("announcementsEnabled");
  const maintenanceEnabled = watch("maintenanceEnabled");

  const onSubmit = async (data: UpdatesSettingsFormData) => {
    setIsSaving(true);
    try {
      const result = await updateSettings({
        announcements: {
          enabled: data.announcementsEnabled,
          title: data.announcementTitle.trim(),
          message: data.announcementMessage.trim(),
          variant: data.announcementVariant,
          dismissible: data.announcementDismissible,
          showOn: {
            public: data.showOnPublic,
            dashboard: data.showOnDashboard,
            admin: data.showOnAdmin,
            support: data.showOnSupport,
          },
        },
        maintenance: {
          enabled: data.maintenanceEnabled,
          message: data.maintenanceMessage.trim(),
          allowAdmin: data.allowAdmin,
          allowSupport: data.allowSupport,
        },
      });

      if (!result.success) {
        toast.error(result.error || "Failed to update settings");
        return;
      }

      toast.success("Settings updated");
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <Card className="rounded-lg border-0">
        <CardHeader>
          <CardTitle>Announcements (Feature Updates)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Enable announcement banner</p>
              <p className="text-sm text-muted-foreground">
                Show a top banner to announce new features or important updates.
              </p>
            </div>
            <Switch
              checked={announcementsEnabled}
              onCheckedChange={(v) => setValue("announcementsEnabled", v)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="announcementTitle">Title</Label>
              <Input
                id="announcementTitle"
                disabled={!announcementsEnabled || isSaving}
                {...register("announcementTitle")}
              />
              {errors.announcementTitle && (
                <p className="text-sm text-destructive">
                  {errors.announcementTitle.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Variant</Label>
              <Select
                value={watch("announcementVariant")}
                onValueChange={(v) =>
                  setValue("announcementVariant", v as any, {
                    shouldValidate: true,
                  })
                }
                disabled={!announcementsEnabled || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select variant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="announcementMessage">Message</Label>
            <Textarea
              id="announcementMessage"
              className="min-h-[100px]"
              disabled={!announcementsEnabled || isSaving}
              {...register("announcementMessage")}
            />
            {errors.announcementMessage && (
              <p className="text-sm text-destructive">
                {errors.announcementMessage.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Dismissible</p>
                <p className="text-sm text-muted-foreground">
                  Allow users to dismiss this banner.
                </p>
              </div>
              <Switch
                checked={watch("announcementDismissible")}
                onCheckedChange={(v) => setValue("announcementDismissible", v)}
                disabled={!announcementsEnabled || isSaving}
              />
            </div>

            <div className="grid gap-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Show on</p>
              <div className="grid gap-2">
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Public</span>
                  <Switch
                    checked={watch("showOnPublic")}
                    onCheckedChange={(v) => setValue("showOnPublic", v)}
                    disabled={!announcementsEnabled || isSaving}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Dashboard</span>
                  <Switch
                    checked={watch("showOnDashboard")}
                    onCheckedChange={(v) => setValue("showOnDashboard", v)}
                    disabled={!announcementsEnabled || isSaving}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Support</span>
                  <Switch
                    checked={watch("showOnSupport")}
                    onCheckedChange={(v) => setValue("showOnSupport", v)}
                    disabled={!announcementsEnabled || isSaving}
                  />
                </label>
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Admin</span>
                  <Switch
                    checked={watch("showOnAdmin")}
                    onCheckedChange={(v) => setValue("showOnAdmin", v)}
                    disabled={!announcementsEnabled || isSaving}
                  />
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg border-0">
        <CardHeader>
          <CardTitle>Maintenance Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Enable maintenance mode</p>
              <p className="text-sm text-muted-foreground">
                Customers will be redirected to a maintenance page.
              </p>
            </div>
            <Switch
              checked={maintenanceEnabled}
              onCheckedChange={(v) => setValue("maintenanceEnabled", v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maintenanceMessage">Maintenance message</Label>
            <Textarea
              id="maintenanceMessage"
              className="min-h-[90px]"
              disabled={!maintenanceEnabled || isSaving}
              {...register("maintenanceMessage")}
            />
            {errors.maintenanceMessage && (
              <p className="text-sm text-destructive">
                {errors.maintenanceMessage.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Allow Admin access</p>
                <p className="text-sm text-muted-foreground">
                  Admins can still use the app during maintenance.
                </p>
              </div>
              <Switch
                checked={watch("allowAdmin")}
                onCheckedChange={(v) => setValue("allowAdmin", v)}
                disabled={!maintenanceEnabled || isSaving}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Allow Support access</p>
                <p className="text-sm text-muted-foreground">
                  Support agents can still use the app during maintenance.
                </p>
              </div>
              <Switch
                checked={watch("allowSupport")}
                onCheckedChange={(v) => setValue("allowSupport", v)}
                disabled={!maintenanceEnabled || isSaving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

