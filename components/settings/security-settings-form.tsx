"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { updateSettings } from "@/actions/settings";
import { SystemSettings } from "@/types/settings";
import { Loader2, Save, Shield, Lock, Clock } from "lucide-react";

const securitySettingsSchema = z.object({
  enableCsrfProtection: z.boolean(),
  sessionMaxAge: z.number().min(3600).max(2592000), // 1 hour to 30 days
  maxLoginAttempts: z.number().min(3).max(10),
  lockoutDuration: z.number().min(5).max(1440), // 5 minutes to 24 hours
  requireEmailVerification: z.boolean(),
  enableTwoFactorAuth: z.boolean(),
});

type SecuritySettingsFormData = z.infer<typeof securitySettingsSchema>;

interface SecuritySettingsFormProps {
  settings: SystemSettings;
}

export function SecuritySettingsForm({ settings }: SecuritySettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SecuritySettingsFormData>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: settings.security,
  });

  const onSubmit = async (data: SecuritySettingsFormData) => {
    setIsLoading(true);

    try {
      const result = await updateSettings({
        security: data,
      });

      if (result.success) {
        toast.success("Security settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred while updating settings");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-lg p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-green-500/10">
            <Shield className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <CardTitle className="text-xl">Security Settings</CardTitle>
            <CardDescription className="mt-1">
              Configure security and authentication settings
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Protection Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Protection Settings
            </h3>
            <div className="space-y-3">
              {/* Enable CSRF Protection */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="enableCsrfProtection"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Enable CSRF Protection
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Protect against Cross-Site Request Forgery attacks
                  </p>
                </div>
                <Switch
                  id="enableCsrfProtection"
                  checked={watch("enableCsrfProtection")}
                  onCheckedChange={(checked) =>
                    setValue("enableCsrfProtection", checked)
                  }
                />
              </div>

              {/* Require Email Verification */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="requireEmailVerification"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Require Email Verification
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Users must verify their email before accessing the system
                  </p>
                </div>
                <Switch
                  id="requireEmailVerification"
                  checked={watch("requireEmailVerification")}
                  onCheckedChange={(checked) =>
                    setValue("requireEmailVerification", checked)
                  }
                />
              </div>

              {/* Enable Two-Factor Auth */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 opacity-60">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="enableTwoFactorAuth"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Enable Two-Factor Authentication
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Allow users to enable 2FA for additional security (Coming
                    Soon)
                  </p>
                </div>
                <Switch
                  id="enableTwoFactorAuth"
                  checked={watch("enableTwoFactorAuth")}
                  onCheckedChange={(checked) =>
                    setValue("enableTwoFactorAuth", checked)
                  }
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Session Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Session Settings
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="grid gap-5 sm:grid-cols-3">
                {/* Session Max Age */}
                <div className="space-y-2">
                  <Label
                    htmlFor="sessionMaxAge"
                    className="text-sm font-medium"
                  >
                    Session Duration (Hours)
                  </Label>
                  <Input
                    id="sessionMaxAge"
                    type="number"
                    value={(watch("sessionMaxAge") / 3600).toFixed(0)}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value);
                      setValue("sessionMaxAge", hours * 3600);
                    }}
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    1-720 hours (30 days max)
                  </p>
                  {errors.sessionMaxAge && (
                    <p className="text-sm text-destructive">
                      {errors.sessionMaxAge.message}
                    </p>
                  )}
                </div>

                {/* Max Login Attempts */}
                <div className="space-y-2">
                  <Label
                    htmlFor="maxLoginAttempts"
                    className="text-sm font-medium"
                  >
                    Max Login Attempts
                  </Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    {...register("maxLoginAttempts", { valueAsNumber: true })}
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Before lockout (3-10)
                  </p>
                  {errors.maxLoginAttempts && (
                    <p className="text-sm text-destructive">
                      {errors.maxLoginAttempts.message}
                    </p>
                  )}
                </div>

                {/* Lockout Duration */}
                <div className="space-y-2">
                  <Label
                    htmlFor="lockoutDuration"
                    className="text-sm font-medium"
                  >
                    Lockout Duration (Min)
                  </Label>
                  <Input
                    id="lockoutDuration"
                    type="number"
                    {...register("lockoutDuration", { valueAsNumber: true })}
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    5-1440 minutes (24h max)
                  </p>
                  {errors.lockoutDuration && (
                    <p className="text-sm text-destructive">
                      {errors.lockoutDuration.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rate Limiting Info */}
          <div className="rounded-xl mb-0 border bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                <Shield className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium">Rate Limiting</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Advanced rate limiting configuration is available in the
                  system configuration files.
                </p>
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
