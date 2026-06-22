"use client";

const SERVICE_WORKER_PATH = "/sw.js";
const CACHE_PREFIX = "solvio-pwa-";

function isLocalhost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

export function supportsServiceWorker() {
  return typeof window !== "undefined" && "serviceWorker" in navigator;
}

export function supportsPushNotifications() {
  return (
    supportsServiceWorker() &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function canUseServiceWorker() {
  return (
    supportsServiceWorker() &&
    (window.isSecureContext || isLocalhost(window.location.hostname))
  );
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function isDevPwaEnabled() {
  return process.env.NEXT_PUBLIC_ENABLE_DEV_PWA === "true";
}

function shouldRegisterServiceWorker() {
  return isProduction() || isDevPwaEnabled();
}

async function clearPwaCaches() {
  if (typeof window === "undefined" || !("caches" in window)) {
    return;
  }

  const cacheKeys = await caches.keys();
  await Promise.all(
    cacheKeys
      .filter((key) => key.startsWith(CACHE_PREFIX))
      .map((key) => caches.delete(key))
  );
}

export async function unregisterPwaServiceWorker() {
  if (!supportsServiceWorker()) {
    return false;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const localRegistrations = registrations.filter((registration) => {
    try {
      return new URL(registration.scope).origin === window.location.origin;
    } catch {
      return false;
    }
  });

  await Promise.all(
    localRegistrations.map((registration) => registration.unregister())
  );
  await clearPwaCaches();

  return localRegistrations.length > 0;
}

export async function registerPwaServiceWorker() {
  if (!canUseServiceWorker()) {
    return null;
  }

  if (!shouldRegisterServiceWorker()) {
    await unregisterPwaServiceWorker();
    return null;
  }

  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    return existing;
  }

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
    scope: "/",
  });
}

export async function getPwaServiceWorkerRegistration() {
  if (!canUseServiceWorker()) {
    return null;
  }

  if (!shouldRegisterServiceWorker()) {
    return null;
  }

  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) {
    return existing;
  }

  return registerPwaServiceWorker();
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  return Uint8Array.from(rawData, (character) => character.charCodeAt(0));
}
