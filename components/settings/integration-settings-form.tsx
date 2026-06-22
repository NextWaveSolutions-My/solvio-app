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
import {
  testDiscordIntegration,
  testSlackIntegration,
  updateSettings,
} from "@/actions/settings";
import { SystemSettings } from "@/types/settings";
import { Loader2, Save, Send, ShoppingCart } from "lucide-react";
import { SiSlack, SiDiscord, SiWhatsapp } from "react-icons/si";
import { Textarea } from "@/components/ui/textarea";

const integrationSettingsSchema = z
  .object({
    envato: z.object({
      enabled: z.boolean(),
      apiToken: z.string().optional(),
      username: z.string().optional(),
    }),
    slack: z.object({
      enabled: z.boolean(),
      webhookUrl: z
        .string()
        .url("Invalid webhook URL")
        .optional()
        .or(z.literal("")),
      notifyOnNewTicket: z.boolean(),
    }),
    discord: z.object({
      enabled: z.boolean(),
      webhookUrl: z
        .string()
        .url("Invalid webhook URL")
        .optional()
        .or(z.literal("")),
      notifyOnNewTicket: z.boolean(),
    }),
    whatsapp: z.object({
      enabled: z.boolean(),
      phoneNumber: z.string().optional(),
      defaultMessage: z.string().optional(),
    }),
  });

type IntegrationSettingsFormData = z.infer<typeof integrationSettingsSchema>;

interface IntegrationSettingsFormProps {
  settings: SystemSettings;
}

export function IntegrationSettingsForm({
  settings,
}: IntegrationSettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingSlack, setIsTestingSlack] = useState(false);
  const [isTestingDiscord, setIsTestingDiscord] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<IntegrationSettingsFormData>({
    resolver: zodResolver(integrationSettingsSchema),
    defaultValues: {
      envato: {
        enabled: settings.integrations.envato.enabled,
        apiToken: settings.integrations.envato.apiToken || "",
        username: settings.integrations.envato.username || "",
      },
      slack: {
        enabled: settings.integrations.slack.enabled,
        webhookUrl: settings.integrations.slack.webhookUrl || "",
        notifyOnNewTicket: settings.integrations.slack.notifyOnNewTicket,
      },
      discord: {
        enabled: settings.integrations.discord.enabled,
        webhookUrl: settings.integrations.discord.webhookUrl || "",
        notifyOnNewTicket: settings.integrations.discord.notifyOnNewTicket,
      },
      whatsapp: {
        enabled: settings.integrations.whatsapp?.enabled ?? false,
        phoneNumber: settings.integrations.whatsapp?.phoneNumber || "",
        defaultMessage:
          settings.integrations.whatsapp?.defaultMessage ||
          "Hello! I have a question about your products.",
      },
    },
  });

  const envatoEnabled = watch("envato.enabled");
  const slackEnabled = watch("slack.enabled");
  const discordEnabled = watch("discord.enabled");
  const whatsappEnabled = watch("whatsapp.enabled");
  const slackWebhookUrl = watch("slack.webhookUrl");
  const discordWebhookUrl = watch("discord.webhookUrl");

  const onSubmit = async (data: IntegrationSettingsFormData) => {
    setIsLoading(true);

    try {
      const result = await updateSettings({
        integrations: {
          envato: {
            ...data.envato,
            apiToken: data.envato.apiToken || undefined,
            username: data.envato.username || undefined,
          },
          slack: {
            ...data.slack,
            webhookUrl: data.slack.webhookUrl || undefined,
          },
          discord: {
            ...data.discord,
            webhookUrl: data.discord.webhookUrl || undefined,
          },
          whatsapp: {
            ...data.whatsapp,
            phoneNumber: data.whatsapp.phoneNumber || undefined,
            defaultMessage: data.whatsapp.defaultMessage || undefined,
          },
        },
      });

      if (result.success) {
        toast.success("Integration settings updated successfully");
      } else {
        toast.error(result.error || "Failed to update settings");
      }
    } catch {
      toast.error("An error occurred while updating settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSlack = async () => {
    setIsTestingSlack(true);

    try {
      const result = await testSlackIntegration();

      if (result.success) {
        toast.success("Test message sent to Slack successfully!");
      } else {
        toast.error(result.error || "Failed to send test message");
      }
    } catch {
      toast.error("An error occurred while testing Slack integration");
    } finally {
      setIsTestingSlack(false);
    }
  };

  const handleTestDiscord = async () => {
    setIsTestingDiscord(true);

    try {
      const result = await testDiscordIntegration();

      if (result.success) {
        toast.success("Test message sent to Discord successfully!");
      } else {
        toast.error(result.error || "Failed to send test message");
      }
    } catch {
      toast.error("An error occurred while testing Discord integration");
    } finally {
      setIsTestingDiscord(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Envato Integration */}
      <Card className="overflow-hidden rounded-lg p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader className="border-b p-6 gap-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <ShoppingCart className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-xl">
                Envato / CodeCanyon Integration
              </CardTitle>
              <CardDescription className="mt-1">
                Validate purchase codes from Envato/CodeCanyon
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {/* Enable Envato */}
          <div className="flex items-center justify-between rounded-xl border bg-muted/20 p-4 hover:bg-muted/30 transition-colors">
            <div className="space-y-0.5">
              <Label
                htmlFor="envato.enabled"
                className="text-sm font-medium cursor-pointer"
              >
                Enable Envato Integration
              </Label>
              <p className="text-xs text-muted-foreground">
                Validate purchase codes when customers create tickets
              </p>
            </div>
            <Switch
              id="envato.enabled"
              checked={watch("envato.enabled")}
              onCheckedChange={(checked) => setValue("envato.enabled", checked)}
            />
          </div>

          {/* API Token */}
          <div className="space-y-2">
            <Label htmlFor="envato.apiToken">Envato API Token</Label>
            <Input
              id="envato.apiToken"
              type="password"
              {...register("envato.apiToken")}
              placeholder="Your Envato API token"
              disabled={!envatoEnabled}
            />
            <p className="text-sm text-muted-foreground">
              Get your API token from{" "}
              <a
                href="https://build.envato.com/create-token/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Envato API
              </a>
            </p>
            {errors.envato?.apiToken && (
              <p className="text-sm text-destructive">
                {errors.envato.apiToken.message}
              </p>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="envato.username">Envato Username</Label>
            <Input
              id="envato.username"
              {...register("envato.username")}
              placeholder="your_envato_username"
              disabled={!envatoEnabled}
            />
            {errors.envato?.username && (
              <p className="text-sm text-destructive">
                {errors.envato.username.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Slack Integration */}
      <Card className="overflow-hidden p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader className="border-b p-6 gap-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4A154B]/10">
              <SiSlack className="h-5 w-5 text-[#4A154B]" />
            </div>
            <div>
              <CardTitle className="text-xl">Slack Integration</CardTitle>
              <CardDescription className="mt-1">
                Send notifications to Slack when tickets are created
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {/* Enable Slack */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="slack.enabled">Enable Slack Integration</Label>
              <p className="text-sm text-muted-foreground">
                Send notifications to your Slack workspace
              </p>
            </div>
            <Switch
              id="slack.enabled"
              checked={watch("slack.enabled")}
              onCheckedChange={(checked) => setValue("slack.enabled", checked)}
            />
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="slack.webhookUrl">Slack Webhook URL</Label>
            <Input
              id="slack.webhookUrl"
              type="url"
              {...register("slack.webhookUrl")}
              placeholder="https://hooks.slack.com/services/..."
              disabled={!slackEnabled}
            />
            <p className="text-sm text-muted-foreground">
              Create a webhook in your Slack workspace settings
            </p>
            {errors.slack?.webhookUrl && (
              <p className="text-sm text-destructive">
                {errors.slack.webhookUrl.message}
              </p>
            )}
          </div>

          {/* Notify on New Ticket */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="slack.notifyOnNewTicket">
                Notify on New Ticket
              </Label>
              <p className="text-sm text-muted-foreground">
                Send a message when a new ticket is created
              </p>
            </div>
            <Switch
              id="slack.notifyOnNewTicket"
              checked={watch("slack.notifyOnNewTicket")}
              onCheckedChange={(checked) =>
                setValue("slack.notifyOnNewTicket", checked)
              }
              disabled={!slackEnabled}
            />
          </div>

          {/* Test Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleTestSlack}
            disabled={isTestingSlack || !slackEnabled || !slackWebhookUrl}
          >
            {isTestingSlack ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Message
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Discord Integration */}
      <Card className="overflow-hidden p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader className="border-b p-6 gap-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5865F2]/10">
              <SiDiscord className="h-5 w-5 text-[#5865F2]" />
            </div>
            <div>
              <CardTitle className="text-xl">Discord Integration</CardTitle>
              <CardDescription className="mt-1">
                Send notifications to Discord when tickets are created
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {/* Enable Discord */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="discord.enabled">
                Enable Discord Integration
              </Label>
              <p className="text-sm text-muted-foreground">
                Send notifications to your Discord server
              </p>
            </div>
            <Switch
              id="discord.enabled"
              checked={watch("discord.enabled")}
              onCheckedChange={(checked) =>
                setValue("discord.enabled", checked)
              }
            />
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="discord.webhookUrl">Discord Webhook URL</Label>
            <Input
              id="discord.webhookUrl"
              type="url"
              {...register("discord.webhookUrl")}
              placeholder="https://discord.com/api/webhooks/..."
              disabled={!discordEnabled}
            />
            <p className="text-sm text-muted-foreground">
              Create a webhook in your Discord server settings
            </p>
            {errors.discord?.webhookUrl && (
              <p className="text-sm text-destructive">
                {errors.discord.webhookUrl.message}
              </p>
            )}
          </div>

          {/* Notify on New Ticket */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="discord.notifyOnNewTicket">
                Notify on New Ticket
              </Label>
              <p className="text-sm text-muted-foreground">
                Send a message when a new ticket is created
              </p>
            </div>
            <Switch
              id="discord.notifyOnNewTicket"
              checked={watch("discord.notifyOnNewTicket")}
              onCheckedChange={(checked) =>
                setValue("discord.notifyOnNewTicket", checked)
              }
              disabled={!discordEnabled}
            />
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleTestDiscord}
            disabled={isTestingDiscord || !discordEnabled || !discordWebhookUrl}
          >
            {isTestingDiscord ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test Message
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp Integration */}
      <Card className="overflow-hidden p-0 border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
        <CardHeader className="border-b p-6 gap-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <SiWhatsapp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-xl">WhatsApp Chat</CardTitle>
              <CardDescription className="mt-1">
                Enable WhatsApp chat button for customer support
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          {/* Enable WhatsApp */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="whatsapp.enabled">Enable WhatsApp Chat</Label>
              <p className="text-sm text-muted-foreground">
                Show WhatsApp option in the floating chat button
              </p>
            </div>
            <Switch
              id="whatsapp.enabled"
              checked={watch("whatsapp.enabled")}
              onCheckedChange={(checked) =>
                setValue("whatsapp.enabled", checked)
              }
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp.phoneNumber">WhatsApp Phone Number</Label>
            <Input
              id="whatsapp.phoneNumber"
              type="tel"
              {...register("whatsapp.phoneNumber")}
              placeholder="+1234567890 (include country code)"
              disabled={!whatsappEnabled}
            />
            <p className="text-sm text-muted-foreground">
              Enter the phone number with country code (e.g., +1234567890)
            </p>
            {errors.whatsapp?.phoneNumber && (
              <p className="text-sm text-destructive">
                {errors.whatsapp.phoneNumber.message}
              </p>
            )}
          </div>

          {/* Default Message */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp.defaultMessage">Default Message</Label>
            <Textarea
              id="whatsapp.defaultMessage"
              {...register("whatsapp.defaultMessage")}
              placeholder="Hello! I have a question about your products."
              disabled={!whatsappEnabled}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              Pre-filled message when customers click the WhatsApp button
            </p>
            {errors.whatsapp?.defaultMessage && (
              <p className="text-sm text-destructive">
                {errors.whatsapp.defaultMessage.message}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Save All Button */}
      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save All Integrations
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
