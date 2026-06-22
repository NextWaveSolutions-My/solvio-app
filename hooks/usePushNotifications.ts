"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  getPushNotificationStatus,
  registerPushSubscription,
  unregisterPushSubscription,
} from "@/actions/push-notifications";
import {
  getPwaServiceWorkerRegistration,
  supportsPushNotifications,
  urlBase64ToUint8Array,
} from "@/lib/pwa/client";

type PushPermissionState = NotificationPermission | "unsupported";

type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushNotificationStatusResult = Awaited<
  ReturnType<typeof getPushNotificationStatus>
>;

const PUSH_STATUS_FRESH_MS = 1_500;

let pushStatusCache:
  | { fetchedAt: number; result: PushNotificationStatusResult }
  | null = null;
let pushStatusRequest: Promise<PushNotificationStatusResult> | null = null;

function invalidatePushStatusCache() {
  pushStatusCache = null;
}

function loadPushStatus(options?: { force?: boolean }) {
  if (!options?.force) {
    if (pushStatusRequest) {
      return pushStatusRequest;
    }

    if (
      pushStatusCache &&
      Date.now() - pushStatusCache.fetchedAt < PUSH_STATUS_FRESH_MS
    ) {
      return Promise.resolve(pushStatusCache.result);
    }
  }

  const request = getPushNotificationStatus().then((result) => {
    if (result.success) {
      pushStatusCache = {
        fetchedAt: Date.now(),
        result,
      };
    }

    return result;
  });

  pushStatusRequest = request;
  request.then(
    () => {
      if (pushStatusRequest === request) {
        pushStatusRequest = null;
      }
    },
    () => {
      if (pushStatusRequest === request) {
        pushStatusRequest = null;
      }
    }
  );

  return request;
}

function isLocalhostHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

function getPermissionState(): PushPermissionState {
  if (typeof window === "undefined" || !supportsPushNotifications()) {
    return "unsupported";
  }

  return Notification.permission;
}

async function getCurrentPushSubscription() {
  const registration = await getPwaServiceWorkerRegistration();
  if (!registration) {
    return null;
  }

  return registration.pushManager.getSubscription();
}

export function usePushNotifications(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [permission, setPermission] = useState<PushPermissionState>(() =>
    getPermissionState()
  );
  const [isConfigured, setIsConfigured] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (refreshOptions?: { force?: boolean }) => {
    const supported =
      typeof window !== "undefined" && supportsPushNotifications();

    if (!supported) {
      setPermission("unsupported");
      setIsConfigured(false);
      setIsSubscribed(false);
      setSubscriptionCount(0);
      setLoading(false);
      return;
    }

    setPermission(Notification.permission);

    try {
      const [statusResult, subscription] = await Promise.all([
        loadPushStatus(refreshOptions),
        getCurrentPushSubscription(),
      ]);

      if (statusResult.success && statusResult.data) {
        setIsConfigured(statusResult.data.configured);
        setSubscriptionCount(statusResult.data.subscriptionCount);
      } else {
        setIsConfigured(false);
      }

      setIsSubscribed(Boolean(subscription));
    } catch (error) {
      console.error("Failed to refresh push notification status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void refresh();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, refresh]);

  const enablePush = useCallback(async () => {
    if (!supportsPushNotifications()) {
      toast.error("This browser does not support push notifications.");
      return;
    }

    if (!isConfigured) {
      toast.error(
        "Web push is not configured on the server. Add your VAPID keys first."
      );
      return;
    }

    setBusy(true);

    try {
      const permissionResult =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast.error(
          permissionResult === "denied"
            ? "Browser notifications are blocked for this site."
            : "Notification permission was not granted."
        );
        return;
      }

      const registration = await getPwaServiceWorkerRegistration();
      if (!registration) {
        const devPwaEnabled =
          process.env.NEXT_PUBLIC_ENABLE_DEV_PWA === "true";
        const onLocalhost = isLocalhostHost(window.location.hostname);

        if (!window.isSecureContext && !onLocalhost) {
          toast.error(
            "Push notifications require HTTPS (localhost is allowed for testing)."
          );
        } else if (process.env.NODE_ENV !== "production" && !devPwaEnabled) {
          toast.error(
            "Service worker is disabled in development. Set NEXT_PUBLIC_ENABLE_DEV_PWA=true or run a production build."
          );
        } else {
          toast.error("Failed to register the service worker for push.");
        }
        return;
      }

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
          toast.error("The public VAPID key is missing.");
          return;
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const subscriptionJson = subscription.toJSON();
      if (
        !subscriptionJson.endpoint ||
        !subscriptionJson.keys?.p256dh ||
        !subscriptionJson.keys.auth
      ) {
        throw new Error("Incomplete push subscription payload.");
      }

      const payload: PushSubscriptionPayload = {
        endpoint: subscriptionJson.endpoint,
        expirationTime: subscriptionJson.expirationTime ?? null,
        keys: {
          p256dh: subscriptionJson.keys.p256dh,
          auth: subscriptionJson.keys.auth,
        },
      };

      invalidatePushStatusCache();
      const result = await registerPushSubscription(payload);
      if (!result.success) {
        toast.error(
          result.error || "Failed to enable browser push notifications."
        );
        return;
      }

      setIsSubscribed(true);
      setSubscriptionCount(result.data?.subscriptionCount ?? subscriptionCount);
      toast.success(
        result.message || "Browser push notifications enabled successfully."
      );
    } catch (error) {
      console.error("Failed to enable browser push notifications:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to enable browser push notifications."
      );
    } finally {
      setBusy(false);
      void refresh({ force: true });
    }
  }, [isConfigured, refresh, subscriptionCount]);

  const disablePush = useCallback(async () => {
    if (!supportsPushNotifications()) {
      toast.error("This browser does not support push notifications.");
      return;
    }

    setBusy(true);

    try {
      const registration = await getPwaServiceWorkerRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (!subscription) {
        setIsSubscribed(false);
        toast.success("Browser push is already disabled on this device.");
        return;
      }

      const endpoint = subscription.endpoint;
      invalidatePushStatusCache();
      const [result] = await Promise.all([
        unregisterPushSubscription(endpoint),
        subscription.unsubscribe(),
      ]);

      if (!result.success) {
        toast.error(
          result.error || "Failed to disable browser push notifications."
        );
        return;
      }

      setIsSubscribed(false);
      setSubscriptionCount(result.data?.subscriptionCount ?? 0);
      toast.success(
        result.message || "Browser push notifications disabled successfully."
      );
    } catch (error) {
      console.error("Failed to disable browser push notifications:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to disable browser push notifications."
      );
    } finally {
      setBusy(false);
      void refresh({ force: true });
    }
  }, [refresh]);

  return {
    permission,
    isSupported: permission !== "unsupported",
    isConfigured,
    isSubscribed,
    subscriptionCount,
    loading,
    busy,
    enablePush,
    disablePush,
    refresh,
  };
}
