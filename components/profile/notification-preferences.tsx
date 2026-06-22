"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Laptop,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  CalendarPlus,
  CalendarClock,
  Shield,
} from "lucide-react";
import {
  getUserPreferences,
  updateUserPreferences,
} from "@/actions/preferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import type { NotificationClickBehavior } from "@/types";

function ChannelSelector({
  label,
  icon: Icon,
  value,
  onChange,
  id,
}: {
  label: string;
  icon: React.ElementType;
  value: string | undefined;
  onChange: (value: "both" | "email" | "in_app" | "none") => void;
  id: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/30 p-4 hover:border-border/60 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">{label}</Label>
      </div>
      <RadioGroup
        value={value || ""}
        onValueChange={(nextValue) =>
          onChange(nextValue as "both" | "email" | "in_app" | "none")
        }
        className="flex flex-wrap gap-2"
      >
        {[
          { value: "both", label: "Both" },
          { value: "email", label: "Email" },
          { value: "in_app", label: "In-App" },
          { value: "none", label: "None" },
        ].map((option) => (
          <div key={`${id}-${option.value}`} className="flex items-center">
            <RadioGroupItem
              value={option.value}
              id={`${id}-${option.value}`}
              className="peer sr-only"
            />
            <Label
              htmlFor={`${id}-${option.value}`}
              className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border border-border/40 bg-background/50 text-muted-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 peer-data-[state=checked]:text-primary transition-all hover:border-border"
            >
              {option.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

export function NotificationPreferences() {
  const [clickBehavior, setClickBehavior] =
    useState<NotificationClickBehavior>("detail");
  const [channelsDefault, setChannelsDefault] = useState<
    "both" | "email" | "in_app" | "none"
  >("both");
  const [channelsComment, setChannelsComment] = useState<
    "both" | "email" | "in_app" | "none"
  >();
  const [channelsMeetingScheduled, setChannelsMeetingScheduled] = useState<
    "both" | "email" | "in_app" | "none"
  >();
  const [channelsMeetingUpdated, setChannelsMeetingUpdated] = useState<
    "both" | "email" | "in_app" | "none"
  >();
  const [channelsAttachment, setChannelsAttachment] = useState<
    "both" | "email" | "in_app" | "none"
  >();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const {
    permission: pushPermission,
    isSupported: pushSupported,
    isConfigured: pushConfigured,
    isSubscribed: pushSubscribed,
    subscriptionCount,
    loading: pushLoading,
    busy: pushBusy,
    enablePush,
    disablePush,
  } = usePushNotifications();

  // Load current preferences
  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      const result = await getUserPreferences();
      if (result.success && result.data) {
        setClickBehavior(result.data.notifications?.clickBehavior || "detail");
        const ch = result.data.notifications?.channels;
        setChannelsDefault(ch?.default || "both");
        setChannelsComment(ch?.comment);
        setChannelsMeetingScheduled(ch?.meetingScheduled);
        setChannelsMeetingUpdated(ch?.meetingUpdated);
        setChannelsAttachment(ch?.attachment);
      }
      setIsLoading(false);
    };

    loadPreferences();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateUserPreferences({
      notifications: {
        clickBehavior,
        channels: {
          default: channelsDefault,
          comment: channelsComment,
          meetingScheduled: channelsMeetingScheduled,
          meetingUpdated: channelsMeetingUpdated,
          attachment: channelsAttachment,
        },
      },
    });

    if (result.success) {
      toast.success("Notification preferences updated successfully");
    } else {
      toast.error(result.error || "Failed to update preferences");
    }
    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-medium text-foreground">
            Notification Preferences
          </h3>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur-sm p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Bell className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">
            Notification Preferences
          </h3>
          <p className="text-xs text-muted-foreground">
            Customize how notifications work for you
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Click Behavior Section */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Click Behavior</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              What happens when you click a notification
            </p>
          </div>

          <RadioGroup
            value={clickBehavior}
            onValueChange={(value) =>
              setClickBehavior(value as NotificationClickBehavior)
            }
            className="grid gap-3"
          >
            <label
              htmlFor="detail"
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                clickBehavior === "detail"
                  ? "border-primary bg-primary/5"
                  : "border-border/40 hover:border-border"
              }`}
            >
              <RadioGroupItem value="detail" id="detail" className="mt-0.5" />
              <div className="flex-1">
                <span className="font-medium text-sm">
                  Show detail page first
                </span>
                <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Recommended
                </span>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  View the full notification content before navigating to the
                  resource.
                </p>
              </div>
            </label>

            <label
              htmlFor="direct"
              className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all ${
                clickBehavior === "direct"
                  ? "border-primary bg-primary/5"
                  : "border-border/40 hover:border-border"
              }`}
            >
              <RadioGroupItem value="direct" id="direct" className="mt-0.5" />
              <div className="flex-1">
                <span className="font-medium text-sm">
                  Go directly to resource
                </span>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Skip the detail page and navigate directly to the related
                  ticket or message.
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Channels Section */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Notification Channels</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose how you receive different types of notifications
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <ChannelSelector
              label="Default"
              icon={Mail}
              value={channelsDefault}
              onChange={setChannelsDefault}
              id="ch-default"
            />
            <ChannelSelector
              label="Comments"
              icon={MessageSquare}
              value={channelsComment}
              onChange={setChannelsComment}
              id="ch-comment"
            />
            <ChannelSelector
              label="Attachments"
              icon={Paperclip}
              value={channelsAttachment}
              onChange={setChannelsAttachment}
              id="ch-attachment"
            />
            <ChannelSelector
              label="Meeting Scheduled"
              icon={CalendarPlus}
              value={channelsMeetingScheduled}
              onChange={setChannelsMeetingScheduled}
              id="ch-meeting-scheduled"
            />
            <ChannelSelector
              label="Meeting Updated"
              icon={CalendarClock}
              value={channelsMeetingUpdated}
              onChange={setChannelsMeetingUpdated}
              id="ch-meeting-updated"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Browser Push</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receive background alerts even when the app is not in the
              foreground. Push follows your in-app notification channels.
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-background/30 p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-primary/10 p-2 text-primary">
                    <Bell className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {pushSubscribed
                        ? "Browser push is active on this device"
                        : "Browser push is not enabled on this device"}
                    </p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Install the app from your browser menu for the best mobile
                      and desktop experience, then enable push here when you are
                      ready.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-muted-foreground">
                    {pushSupported ? "Push supported" : "Push unsupported"}
                  </span>
                  <span className="rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-muted-foreground">
                    Server {pushConfigured ? "configured" : "not configured"}
                  </span>
                  <span className="rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-muted-foreground">
                    Permission: {pushPermission}
                  </span>
                  <span className="rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-muted-foreground">
                    Active browsers: {subscriptionCount}
                  </span>
                </div>

                {!pushSupported && (
                  <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    <Laptop className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Browser push requires a modern browser with service worker
                      and Push API support, plus HTTPS in production.
                    </p>
                  </div>
                )}

                {pushSupported && !pushConfigured && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
                      and `VAPID_SUBJECT` on the server before enabling browser
                      push.
                    </p>
                  </div>
                )}

                {pushPermission === "denied" && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      Notifications are blocked for this site in your browser.
                      Re-enable them in browser settings, then try again here.
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant={pushSubscribed ? "outline" : "default"}
                onClick={pushSubscribed ? disablePush : enablePush}
                disabled={
                  pushLoading ||
                  pushBusy ||
                  !pushSupported ||
                  (!pushConfigured && !pushSubscribed)
                }
                className="rounded-lg lg:min-w-48"
              >
                {pushBusy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : pushSubscribed ? (
                  "Disable On This Device"
                ) : (
                  "Enable Browser Push"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-stretch pt-4 border-t border-border/40 sm:justify-end">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Preferences"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
