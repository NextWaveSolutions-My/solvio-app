import webpush from "web-push";

import { getCollection } from "@/lib/db";

export type PushSubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type StoredPushSubscription = {
  userId: string;
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
};

type PushMessagePayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notificationId?: string | null;
  data?: Record<string, unknown> | null;
};

function getConfiguredVapidKeys() {
  return {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
    subject: process.env.VAPID_SUBJECT,
  };
}

export function isWebPushConfigured() {
  const { publicKey, privateKey, subject } = getConfiguredVapidKeys();
  return Boolean(publicKey && privateKey && subject);
}

function ensureWebPushConfigured() {
  if (!isWebPushConfigured()) {
    throw new Error("Web push is not configured.");
  }

  const { publicKey, privateKey, subject } = getConfiguredVapidKeys();
  webpush.setVapidDetails(subject!, publicKey!, privateKey!);
}

function normalizePushSubscription(subscription: PushSubscriptionPayload) {
  if (
    !subscription.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    throw new Error("Invalid push subscription payload.");
  }

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  } satisfies PushSubscriptionPayload;
}

function createSerializedPushPayload(payload: PushMessagePayload) {
  const rawData = payload.data && typeof payload.data === "object" ? payload.data : {};
  const url =
    typeof rawData.url === "string" && rawData.url
      ? rawData.url
      : payload.url || "/";

  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url,
    icon: "/pwa-icons/192",
    badge: "/pwa-icons/192",
    tag:
      payload.tag ||
      (payload.notificationId ? `notification:${payload.notificationId}` : undefined),
    notificationId: payload.notificationId ?? null,
    data: {
      ...rawData,
      url,
    },
  });
}

export async function countPushSubscriptionsForUser(userId: string) {
  const collection =
    await getCollection<StoredPushSubscription>("push_subscriptions");
  return collection.countDocuments({ userId });
}

export async function upsertPushSubscription(
  userId: string,
  subscription: PushSubscriptionPayload,
  userAgent?: string
) {
  const normalized = normalizePushSubscription(subscription);
  const collection =
    await getCollection<StoredPushSubscription>("push_subscriptions");
  const now = new Date();

  await collection.updateOne(
    {
      endpoint: normalized.endpoint,
    },
    {
      $set: {
        userId,
        expirationTime: normalized.expirationTime,
        keys: normalized.keys,
        updatedAt: now,
        ...(userAgent ? { userAgent } : {}),
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    }
  );
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const collection =
    await getCollection<StoredPushSubscription>("push_subscriptions");
  await collection.deleteOne({ userId, endpoint });
}

export async function sendPushNotificationToSubscription(
  subscription: PushSubscriptionPayload,
  payload: PushMessagePayload
) {
  if (!isWebPushConfigured()) {
    return {
      success: false as const,
      skipped: true as const,
      error: "Web push is not configured.",
    };
  }

  ensureWebPushConfigured();

  try {
    await webpush.sendNotification(
      normalizePushSubscription(subscription),
      createSerializedPushPayload(payload),
      {
        TTL: 60,
      }
    );

    return {
      success: true as const,
    };
  } catch (error) {
    const sendError = error as Error & { statusCode?: number };

    return {
      success: false as const,
      skipped: false as const,
      statusCode: sendError.statusCode,
      error: sendError.message,
    };
  }
}

export async function sendPushNotificationToUser(
  userId: string,
  payload: PushMessagePayload
) {
  if (!isWebPushConfigured()) {
    return {
      success: false as const,
      skipped: true as const,
      sent: 0,
      failed: 0,
      removed: 0,
    };
  }

  ensureWebPushConfigured();

  const collection =
    await getCollection<StoredPushSubscription>("push_subscriptions");
  const subscriptions = await collection.find({ userId }).toArray();

  if (subscriptions.length === 0) {
    return {
      success: true as const,
      skipped: false as const,
      sent: 0,
      failed: 0,
      removed: 0,
    };
  }

  let sent = 0;
  let failed = 0;
  let removed = 0;
  const now = new Date();

  for (const subscription of subscriptions) {
    const result = await sendPushNotificationToSubscription(subscription, payload);

    if (result.success) {
      sent += 1;
      await collection.updateOne(
        { userId, endpoint: subscription.endpoint },
        { $set: { lastUsedAt: now, updatedAt: now } }
      );
      continue;
    }

    failed += 1;

    if (result.statusCode === 404 || result.statusCode === 410) {
      await collection.deleteOne({
        userId,
        endpoint: subscription.endpoint,
      });
      removed += 1;
      continue;
    }

    console.error("Failed to send web push notification:", result.error);
  }

  return {
    success: failed === 0,
    skipped: false as const,
    sent,
    failed,
    removed,
  };
}
