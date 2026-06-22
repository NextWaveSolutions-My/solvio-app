"use client";

import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SystemSettings } from "@/types/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Send, Mail } from "lucide-react";
import { updateSettings, testEmailSettings } from "@/actions/settings";

const emailSettingsSchema = z.object({
  enabled: z.boolean(),
  notifyOnNewTicket: z.boolean(),
  notifyOnTicketUpdate: z.boolean(),
  notifyOnNewComment: z.boolean(),
  notifyOnTicketAssignment: z.boolean(),
  notifyOnTicketResolution: z.boolean(),
  adminNotificationEmail: z.string().email("Invalid email address"),
});

type EmailSettingsFormData = z.infer<typeof emailSettingsSchema>;

interface EmailSettingsFormProps {
  settings: SystemSettings;
}

export function EmailSettingsForm({ settings }: EmailSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EmailSettingsFormData>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: settings.email,
  });

  const onSubmit = async (data: EmailSettingsFormData) => {
    setIsLoading(true);

    try {
      const result = await updateSettings({
        email: data,
      });

      if (result.success) {
        toast.success("Email settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch (error) {
      toast.error("An error occurred while updating settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestEmail = async () => {
    setIsTesting(true);

    try {
      const result = await testEmailSettings();

      if (result.success) {
        toast.success("Test email sent successfully! Check your inbox.");
      } else {
        toast.error(result.error || "Failed to send test email");
      }
    } catch (error) {
      toast.error("An error occurred while sending test email");
    } finally {
      setIsTesting(false);
    }
  };

  const emailEnabled = watch("enabled");

  return (
    <Card className="overflow-hidden rounded-lg p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-500/10">
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-xl">Email Settings</CardTitle>
            <CardDescription className="mt-1">
              Configure email notifications for tickets and updates
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Master Toggle Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Email Service
            </h3>
            <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
              <div className="space-y-0.5">
                <Label
                  htmlFor="enabled"
                  className="text-sm font-medium cursor-pointer"
                >
                  Enable Email Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Send email notifications for ticket events
                </p>
              </div>
              <Switch
                id="enabled"
                checked={watch("enabled")}
                onCheckedChange={(checked) => setValue("enabled", checked)}
              />
            </div>
          </div>

          {/* Admin Email Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Admin Notifications
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5 space-y-2">
              <Label
                htmlFor="adminNotificationEmail"
                className="text-sm font-medium"
              >
                Admin Notification Email
              </Label>
              <Input
                id="adminNotificationEmail"
                type="email"
                {...register("adminNotificationEmail")}
                placeholder="admin@example.com"
                disabled={!emailEnabled}
                className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                Email address to receive admin notifications
              </p>
              {errors.adminNotificationEmail && (
                <p className="text-sm text-destructive">
                  {errors.adminNotificationEmail.message}
                </p>
              )}
            </div>
          </div>

          {/* Notification Preferences Section */}
          <div className="space-y-4 mb-0">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Notification Preferences
            </h3>
            <div className="space-y-3">
              {/* Notify on New Ticket */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="notifyOnNewTicket"
                    className="text-sm font-medium cursor-pointer"
                  >
                    New Ticket Created
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when a new ticket is created
                  </p>
                </div>
                <Switch
                  id="notifyOnNewTicket"
                  checked={watch("notifyOnNewTicket")}
                  onCheckedChange={(checked) =>
                    setValue("notifyOnNewTicket", checked)
                  }
                  disabled={!emailEnabled}
                />
              </div>

              {/* Notify on Ticket Update */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="notifyOnTicketUpdate"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Ticket Status Changed
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when ticket status is updated
                  </p>
                </div>
                <Switch
                  id="notifyOnTicketUpdate"
                  checked={watch("notifyOnTicketUpdate")}
                  onCheckedChange={(checked) =>
                    setValue("notifyOnTicketUpdate", checked)
                  }
                  disabled={!emailEnabled}
                />
              </div>

              {/* Notify on New Comment */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="notifyOnNewComment"
                    className="text-sm font-medium cursor-pointer"
                  >
                    New Comment Added
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when a new comment is added
                  </p>
                </div>
                <Switch
                  id="notifyOnNewComment"
                  checked={watch("notifyOnNewComment")}
                  onCheckedChange={(checked) =>
                    setValue("notifyOnNewComment", checked)
                  }
                  disabled={!emailEnabled}
                />
              </div>

              {/* Notify on Ticket Assignment */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="notifyOnTicketAssignment"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Ticket Assigned
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when a ticket is assigned to support staff
                  </p>
                </div>
                <Switch
                  id="notifyOnTicketAssignment"
                  checked={watch("notifyOnTicketAssignment")}
                  onCheckedChange={(checked) =>
                    setValue("notifyOnTicketAssignment", checked)
                  }
                  disabled={!emailEnabled}
                />
              </div>

              {/* Notify on Ticket Resolution */}
              <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="notifyOnTicketResolution"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Ticket Resolved
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when a ticket is marked as resolved
                  </p>
                </div>
                <Switch
                  id="notifyOnTicketResolution"
                  checked={watch("notifyOnTicketResolution")}
                  onCheckedChange={(checked) =>
                    setValue("notifyOnTicketResolution", checked)
                  }
                  disabled={!emailEnabled}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between py-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestEmail}
              disabled={isTesting || !emailEnabled}
              className="h-11 px-5"
            >
              {isTesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>

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
