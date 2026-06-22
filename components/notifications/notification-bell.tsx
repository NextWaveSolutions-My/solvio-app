"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import type { ClientNotification } from "@/types/realtime";
import { NotificationItem } from "./notification-item";
import { Skeleton } from "@/components/ui/skeleton";

const SUPPORT_ALLOWED_TYPES = [
  "ticket_assignment",
  "ticket_status",
  "comment",
  "attachment",
  "meeting_scheduled",
  "meeting_updated",
  "meeting_cancelled",
  "meeting_reminder",
  "new_message",
  "ticket_mention",
  "installation_status",
  "customization_status",
] as const;

interface NotificationBellProps {
  userId: string;
  userRole?: string;
  basePath?: string; // e.g., "/dashboard/notifications", "/admin/notifications", etc.
  clickBehavior?: "detail" | "direct"; // User preference for click behavior
}

const FOREGROUND_PUSH_EVENT = "solvio:push:foreground";
const MAX_REMEMBERED_NOTIFICATION_IDS = 300;

type PushForegroundPayload = {
  notificationId?: string | null;
  title?: string;
  body?: string;
  tag?: string;
  data?: Record<string, unknown> | null;
};

function getNotificationDestination(
  notification: ClientNotification,
  basePath: string,
  clickBehavior: "detail" | "direct"
) {
  const mongoNotificationId =
    typeof notification.data?.notificationId === "string"
      ? notification.data.notificationId
      : notification.id;

  if (basePath && mongoNotificationId) {
    return `${basePath}/${mongoNotificationId}`;
  }

  if (
    clickBehavior === "direct" &&
    typeof notification.data?.url === "string" &&
    notification.data.url
  ) {
    return notification.data.url;
  }

  return basePath || undefined;
}

export function NotificationBell({
  userId,
  userRole,
  basePath = "/dashboard/notifications",
  clickBehavior = "detail",
}: NotificationBellProps) {
  const router = useRouter();
  const audioContextRef = useRef<AudioContext | null>(null);
  const canPlaySoundRef = useRef(false);
  const announcedIdsRef = useRef<string[]>([]);
  const announcedIdSetRef = useRef<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);

  const {
    permission: pushPermission,
    isSupported: pushSupported,
    isConfigured: pushConfigured,
    isSubscribed: pushSubscribed,
    loading: pushLoading,
    busy: pushBusy,
    enablePush,
    disablePush,
  } = usePushNotifications({ enabled: menuOpen });

  const allowedTypes =
    userRole === "support" ? SUPPORT_ALLOWED_TYPES : undefined;

  const rememberAnnouncedId = useCallback((id: string) => {
    if (!id || announcedIdSetRef.current.has(id)) {
      return false;
    }

    announcedIdSetRef.current.add(id);
    announcedIdsRef.current.push(id);

    if (announcedIdsRef.current.length > MAX_REMEMBERED_NOTIFICATION_IDS) {
      const removedId = announcedIdsRef.current.shift();
      if (removedId) {
        announcedIdSetRef.current.delete(removedId);
      }
    }

    return true;
  }, []);

  const ensureAudioContext = useCallback(async () => {
    if (typeof window === "undefined") {
      return null;
    }

    const AudioContextCtor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextCtor) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playNotificationSound = useCallback(async () => {
    if (!canPlaySoundRef.current) {
      return;
    }

    const audioContext = await ensureAudioContext();
    if (!audioContext) {
      return;
    }

    const now = audioContext.currentTime;
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.075, now + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    masterGain.connect(audioContext.destination);

    const beep = (frequency: number, startAt: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, startAt);

      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.7, startAt + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
    };

    beep(920, now, 0.1);
    beep(720, now + 0.12, 0.12);
  }, [ensureAudioContext]);

  const showForegroundAlert = useCallback(
    (notification: ClientNotification) => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      const dedupeId =
        typeof notification.data?.notificationId === "string"
          ? notification.data.notificationId
          : notification.id;

      if (!rememberAnnouncedId(dedupeId)) {
        return;
      }

      const destination = getNotificationDestination(
        notification,
        basePath,
        clickBehavior
      );

      void playNotificationSound();

      toast(notification.title || "New notification", {
        description: notification.body || "You have a new update.",
        duration: 6000,
        action: destination
          ? {
              label: "Open",
              onClick: () => router.push(destination),
            }
          : undefined,
      });
    },
    [basePath, clickBehavior, playNotificationSound, rememberAnnouncedId, router]
  );

  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } =
    useRealtimeNotifications(userId, {
      allowedTypes,
      onNotificationCreated: showForegroundAlert,
    });

  const recentNotifications = notifications.slice(0, 5);
  const isPushBlocked = pushPermission === "denied" && !pushSubscribed;
  const pushToggleDisabled =
    pushLoading ||
    pushBusy ||
    !pushSupported ||
    (!pushConfigured && !pushSubscribed) ||
    isPushBlocked;

  useEffect(() => {
    const unlockAudio = () => {
      canPlaySoundRef.current = true;
      void ensureAudioContext();
    };

    window.addEventListener("pointerdown", unlockAudio, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", unlockAudio, {
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, [ensureAudioContext]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const handleServiceWorkerMessage = (
      event: MessageEvent<{ type?: string; payload?: PushForegroundPayload }>
    ) => {
      if (event.data?.type !== FOREGROUND_PUSH_EVENT || !event.data.payload) {
        return;
      }

      const payload = event.data.payload;
      const payloadData =
        payload.data && typeof payload.data === "object" ? payload.data : null;
      const fallbackId =
        typeof payload.tag === "string" && payload.tag
          ? `push:${payload.tag}`
          : `push:${Date.now()}`;
      const id =
        (typeof payload.notificationId === "string" &&
          payload.notificationId) ||
        (typeof payloadData?.notificationId === "string" &&
          payloadData.notificationId) ||
        fallbackId;

      showForegroundAlert({
        id,
        user_id: userId,
        type:
          typeof payloadData?.source === "string" ? payloadData.source : "push",
        title:
          typeof payload.title === "string" && payload.title
            ? payload.title
            : "New notification",
        body:
          typeof payload.body === "string" && payload.body
            ? payload.body
            : "You have a new update.",
        data: payloadData,
        read: false,
        created_at: new Date().toISOString(),
        read_at: null,
      });
    };

    if (!("serviceWorker" in navigator) || !navigator.serviceWorker) {
      return;
    }

    navigator.serviceWorker.addEventListener(
      "message",
      handleServiceWorkerMessage
    );

    return () => {
      if ("serviceWorker" in navigator && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener(
          "message",
          handleServiceWorkerMessage
        );
      }
    };
  }, [showForegroundAlert, userId]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, []);

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <>
              {/* Badge count */}
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-blue-700 text-destructive-foreground text-xs text-white font-medium flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 overflow-hidden p-0 md:w-96"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 text-[11px] font-semibold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              className="cursor-pointer text-xs font-medium text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={(e) => {
                e.stopPropagation();
                markAllAsRead();
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        <DropdownMenuSeparator className="m-0" />

        {/* Loading State */}
        {loading && (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && notifications.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">You&apos;re all caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              New notifications will show up here.
            </p>
          </div>
        )}

        {/* Notifications List */}
        {!loading && recentNotifications.length > 0 && (
          <div className="max-h-90 space-y-0.5 overflow-y-auto p-1.5">
            {recentNotifications?.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                basePath={basePath}
                clickBehavior={clickBehavior}
              />
            ))}
          </div>
        )}

        {/* View All Link */}
        {!loading && notifications.length > 0 && (
          <button
            type="button"
            className="w-full cursor-pointer py-2.5 text-center text-sm font-medium text-blue-700 transition-colors hover:bg-muted/50 dark:text-blue-400"
            onClick={() => router.push(basePath)}
          >
            View all notifications
          </button>
        )}

        {/* Browser notifications */}
        <DropdownMenuSeparator className="m-0" />
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight">
                Browser notifications
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {pushSupported
                  ? pushSubscribed
                    ? "On for this device."
                    : "Get alerts while the app is in the background."
                  : "Not supported in this browser."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {(pushLoading || pushBusy) && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={pushSubscribed}
                disabled={pushToggleDisabled}
                aria-label="Enable browser notifications"
                onCheckedChange={(checked) => {
                  if (checked) {
                    void enablePush();
                    return;
                  }
                  void disablePush();
                }}
              />
            </div>
          </div>

          {isPushBlocked && (
            <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200/70 bg-amber-50 px-2.5 py-2 text-[11px] text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Blocked in browser settings. Re-enable for this site, then
                toggle again.
              </p>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
