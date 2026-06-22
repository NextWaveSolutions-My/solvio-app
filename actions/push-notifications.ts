"use server";

import { headers } from "next/headers";

import { requireAuth } from "@/lib/auth-utils";
import {
  countPushSubscriptionsForUser,
  deletePushSubscription,
  isWebPushConfigured,
  sendPushNotificationToSubscription,
  upsertPushSubscription,
  type PushSubscriptionPayload,
} from "@/lib/push/server";
import type { ApiResponse, UserRole } from "@/types";

type PushNotificationStatus = {
  configured: boolean;
  subscriptionCount: number;
};

function getNotificationsPathForRole(role: UserRole) {
  switch (role) {
    case "admin":
      return "/admin/notifications";
    case "support":
      return "/support-agent/notifications";
    default:
      return "/dashboard/notifications";
  }
}

export async function getPushNotificationStatus(): Promise<
  ApiResponse<PushNotificationStatus>
> {
  try {
    const session = await requireAuth();
    const subscriptionCount = await countPushSubscriptionsForUser(
      session.user.id
    );

    return {
      success: true,
      data: {
        configured: isWebPushConfigured(),
        subscriptionCount,
      },
    };
  } catch (error) {
    console.error("Get push notification status error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get push notification status",
    };
  }
}

export async function registerPushSubscription(
  subscription: PushSubscriptionPayload
): Promise<ApiResponse<{ subscriptionCount: number }>> {
  try {
    const session = await requireAuth();

    if (!isWebPushConfigured()) {
      return {
        success: false,
        error:
          "Web push is not configured. Add your VAPID keys before enabling browser notifications.",
      };
    }

    const requestHeaders = await headers();
    await upsertPushSubscription(
      session.user.id,
      subscription,
      requestHeaders.get("user-agent") || undefined
    );

    const role = (
      (session.user as { role?: UserRole }).role || "customer"
    ) as UserRole;
    const notificationsPath = getNotificationsPathForRole(role);

    const testNotification = await sendPushNotificationToSubscription(
      subscription,
      {
        title: "Browser push is ready",
        body: "You will now receive ticket, chat, and activity alerts even when the app is in the background.",
        url: notificationsPath,
        tag: "push-subscription-ready",
        data: {
          url: notificationsPath,
          source: "push_setup",
        },
      }
    );

    if (!testNotification.success && !testNotification.skipped) {
      console.error(
        "Failed to deliver the initial push notification:",
        testNotification.error
      );
    }

    const subscriptionCount = await countPushSubscriptionsForUser(
      session.user.id
    );

    return {
      success: true,
      data: {
        subscriptionCount,
      },
      message: "Browser push notifications enabled successfully.",
    };
  } catch (error) {
    console.error("Register push subscription error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to register push subscription",
    };
  }
}

export async function unregisterPushSubscription(
  endpoint: string
): Promise<ApiResponse<{ subscriptionCount: number }>> {
  try {
    const session = await requireAuth();

    if (!endpoint) {
      return {
        success: false,
        error: "Missing push subscription endpoint.",
      };
    }

    await deletePushSubscription(session.user.id, endpoint);
    const subscriptionCount = await countPushSubscriptionsForUser(
      session.user.id
    );

    return {
      success: true,
      data: {
        subscriptionCount,
      },
      message: "Browser push notifications disabled for this device.",
    };
  } catch (error) {
    console.error("Unregister push subscription error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to unregister push subscription",
    };
  }
}
