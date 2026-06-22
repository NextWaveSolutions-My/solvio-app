"use client";

import { z } from "zod";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState, useRef, useMemo } from "react";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateSettings, uploadFavicon } from "@/actions/settings";
import { SystemSettings } from "@/types/settings";
import { Loader2, Save, Palette, Upload } from "lucide-react";
import { FixColorsButton } from "./fix-colors-button";

const appearanceSettingsSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  successColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  warningColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  infoColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color")
    .optional(),
  errorColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  footerText: z.string().optional(),
  copyrightText: z.string().optional(),
  customCss: z.string().optional(),
});

type AppearanceSettingsFormData = z.infer<typeof appearanceSettingsSchema>;

interface AppearanceSettingsFormProps {
  settings: SystemSettings;
}

export function AppearanceSettingsForm({
  settings,
}: AppearanceSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState(
    settings.appearance.faviconUrl || ""
  );
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AppearanceSettingsFormData>({
    resolver: zodResolver(appearanceSettingsSchema),
    defaultValues: {
      primaryColor: settings.appearance.primaryColor,
      secondaryColor: settings.appearance.secondaryColor,
      accentColor: settings.appearance.accentColor,
      successColor:
        settings.appearance.successColor ||
        DEFAULT_SETTINGS.appearance.successColor,
      warningColor:
        settings.appearance.warningColor ||
        DEFAULT_SETTINGS.appearance.warningColor,
      infoColor:
        settings.appearance.infoColor || settings.appearance.primaryColor,
      errorColor:
        settings.appearance.errorColor ||
        DEFAULT_SETTINGS.appearance.errorColor,
      footerText: settings.appearance.footerText || "",
      copyrightText: settings.appearance.copyrightText || "",
      customCss: settings.appearance.customCss || "",
    },
  });

  const primaryColor = watch("primaryColor");
  const secondaryColor = watch("secondaryColor");
  const accentColor = watch("accentColor");
  const successColor = watch("successColor");
  const warningColor = watch("warningColor");
  const errorColor = watch("errorColor");
  const infoColor = watch("infoColor");

  // Determine contrast text color for preview based on luminance
  const contrast = useMemo(() => {
    const hexToRgb = (hex?: string) => {
      if (!hex) return { r: 0, g: 0, b: 0 };
      const n = hex.replace("#", "");
      const r = parseInt(n.substring(0, 2), 16);
      const g = parseInt(n.substring(2, 4), 16);
      const b = parseInt(n.substring(4, 6), 16);
      return { r, g, b };
    };
    const pick = (hex?: string) => {
      const { r, g, b } = hexToRgb(hex);
      // perceived brightness
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 180 ? "#111111" : "#ffffff";
    };
    return {
      primary: pick(primaryColor),
      secondary: pick(secondaryColor),
      accent: pick(accentColor),
      info: pick(infoColor),
    };
  }, [primaryColor, secondaryColor, accentColor, infoColor]);

  const handleFaviconUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFavicon(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadFavicon(formData);

      if (result.success && result.data) {
        setFaviconUrl(result.data.url);
        router.refresh();
        toast.success("Favicon uploaded successfully");
      } else {
        toast.error(result.error || "Failed to upload favicon");
      }
    } catch {
      toast.error("An error occurred while uploading favicon");
    } finally {
      setIsUploadingFavicon(false);
      if (faviconInputRef.current) {
        faviconInputRef.current.value = "";
      }
    }
  };

  const onSubmit = async (data: AppearanceSettingsFormData) => {
    setIsLoading(true);

    try {
      const result = await updateSettings({
        appearance: {
          ...data,
          footerText: data.footerText || undefined,
          copyrightText: data.copyrightText || undefined,
          customCss: data.customCss || undefined,
        },
      });

      if (result.success) {
        // Apply the updated brand CSS variables immediately for a live preview
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          const set = (k: string, v?: string) =>
            v && root.style.setProperty(k, v);
          set(
            "--brand-primary",
            result.data?.appearance?.primaryColor || primaryColor
          );
          set(
            "--brand-secondary",
            result.data?.appearance?.secondaryColor || secondaryColor
          );
          set(
            "--brand-accent",
            result.data?.appearance?.accentColor || accentColor
          );
          set("--brand-success", result.data?.appearance?.successColor);
          set("--brand-warning", result.data?.appearance?.warningColor);
          set("--brand-error", result.data?.appearance?.errorColor);
          const ic = result.data?.appearance?.infoColor || infoColor;
          if (ic) set("--brand-info", ic);
        }
        // Re-render server components to refresh CSS in <head>
        router.refresh();
        toast.success("Appearance settings updated successfully");
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
    <Card className="overflow-hidden rounded-lg p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
              <Palette className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Appearance Settings</CardTitle>
              <CardDescription className="mt-1">
                Customize the look and feel of your support system
              </CardDescription>
            </div>
          </div>
          <FixColorsButton />
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Favicon Upload Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Favicon</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload your favicon (recommended size: 32x32px or 16x16px, max
                  1MB)
                </p>
              </div>
            </div>

            {faviconUrl && (
              <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                <div className="shrink-0">
                  <Image
                    width={32}
                    height={32}
                    src={faviconUrl}
                    alt="Favicon preview"
                    className="h-8 w-8 object-contain"
                  />
                </div>
                <span className="text-sm text-muted-foreground flex-1">
                  Current favicon
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*,.ico"
                onChange={handleFaviconUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => faviconInputRef.current?.click()}
                disabled={isUploadingFavicon}
              >
                {isUploadingFavicon ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Favicon
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Brand Colors Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Brand Colors</Label>

            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  {...register("primaryColor")}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setValue("primaryColor", e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
              {errors.primaryColor && (
                <p className="text-sm text-destructive">
                  {errors.primaryColor.message}
                </p>
              )}
            </div>

            {/* Secondary Color */}
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  {...register("secondaryColor")}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setValue("secondaryColor", e.target.value)}
                  placeholder="#8b5cf6"
                  className="flex-1"
                />
              </div>
              {errors.secondaryColor && (
                <p className="text-sm text-destructive">
                  {errors.secondaryColor.message}
                </p>
              )}
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent Color</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  {...register("accentColor")}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setValue("accentColor", e.target.value)}
                  placeholder="#10b981"
                  className="flex-1"
                />
              </div>
              {errors.accentColor && (
                <p className="text-sm text-destructive">
                  {errors.accentColor.message}
                </p>
              )}
            </div>

            {/* Success Color */}
            <div className="space-y-2">
              <Label htmlFor="successColor">Success Color</Label>
              <div className="flex gap-2">
                <Input
                  id="successColor"
                  type="color"
                  {...register("successColor")}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={successColor}
                  onChange={(e) => setValue("successColor", e.target.value)}
                  placeholder="#10b981"
                  className="flex-1"
                />
              </div>
              {errors.successColor && (
                <p className="text-sm text-destructive">
                  {errors.successColor.message}
                </p>
              )}
            </div>

            {/* Warning Color */}
            <div className="space-y-2">
              <Label htmlFor="warningColor">Warning Color</Label>
              <div className="flex gap-2">
                <Input
                  id="warningColor"
                  type="color"
                  {...register("warningColor")}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={warningColor}
                  onChange={(e) => setValue("warningColor", e.target.value)}
                  placeholder="#f59e0b"
                  className="flex-1"
                />
              </div>
              {errors.warningColor && (
                <p className="text-sm text-destructive">
                  {errors.warningColor.message}
                </p>
              )}
            </div>

            {/* Info Color */}
            <div className="space-y-2">
              <Label htmlFor="infoColor">Info Color</Label>
              <div className="flex gap-2">
                <Input
                  id="infoColor"
                  type="color"
                  {...register("infoColor")}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={infoColor}
                  onChange={(e) => setValue("infoColor", e.target.value)}
                  placeholder="#0ea5e9"
                  className="flex-1"
                />
              </div>
              {errors.infoColor && (
                <p className="text-sm text-destructive">
                  {errors.infoColor.message}
                </p>
              )}
            </div>

            {/* Error Color */}
            <div className="space-y-2">
              <Label htmlFor="errorColor">Error Color</Label>
              <div className="flex gap-2">
                <Input
                  id="errorColor"
                  type="color"
                  {...register("errorColor")}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={errorColor}
                  onChange={(e) => setValue("errorColor", e.target.value)}
                  placeholder="#ef4444"
                  className="flex-1"
                />
              </div>
              {errors.errorColor && (
                <p className="text-sm text-destructive">
                  {errors.errorColor.message}
                </p>
              )}
            </div>
          </div>

          {/* Text Customization Section */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">
              Text Customization
            </Label>

            {/* Footer Text */}
            <div className="space-y-2">
              <Label htmlFor="footerText">Footer Text (Optional)</Label>
              <Input
                id="footerText"
                {...register("footerText")}
                placeholder="© 2024 Your Company. All rights reserved."
              />
              <p className="text-sm text-muted-foreground">
                Custom text to display in the footer
              </p>
              {errors.footerText && (
                <p className="text-sm text-destructive">
                  {errors.footerText.message}
                </p>
              )}
            </div>

            {/* Copyright Text */}
            <div className="space-y-2">
              <Label htmlFor="copyrightText">Copyright Text (Optional)</Label>
              <Input
                id="copyrightText"
                {...register("copyrightText")}
                placeholder="Copyright © 2024 Your Company"
              />
              <p className="text-sm text-muted-foreground">
                Copyright notice to display
              </p>
              {errors.copyrightText && (
                <p className="text-sm text-destructive">
                  {errors.copyrightText.message}
                </p>
              )}
            </div>
          </div>

          {/* Custom CSS */}
          <div className="space-y-2">
            <Label htmlFor="customCss">Custom CSS (Optional)</Label>
            <Textarea
              id="customCss"
              {...register("customCss")}
              placeholder=".custom-class { color: red; }"
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground">
              Add custom CSS to override default styles. Use with caution.
            </p>
            {errors.customCss && (
              <p className="text-sm text-destructive">
                {errors.customCss.message}
              </p>
            )}
          </div>

          {/* Preview Section */}
          <div className="rounded-lg border mb-0 p-4 space-y-4">
            <Label className="text-base font-semibold">Color Preview</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Button
                  type="button"
                  style={{
                    backgroundColor: primaryColor,
                    color: contrast.primary,
                  }}
                  className="w-full"
                >
                  Primary
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Primary Color
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  style={{
                    backgroundColor: secondaryColor,
                    color: contrast.secondary,
                  }}
                  className="w-full"
                >
                  Secondary
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Secondary Color
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  style={{
                    backgroundColor: accentColor,
                    color: contrast.accent,
                  }}
                  className="w-full"
                >
                  Accent
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Accent Color
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  style={{ backgroundColor: infoColor, color: contrast.info }}
                  className="w-full"
                >
                  Info
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Info Color
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end py-6">
            <Button type="submit" disabled={isLoading}>
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
