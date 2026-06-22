const CACHE_NAME = "solvio-pwa-v4";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [OFFLINE_URL, "/manifest.webmanifest", "/pwa-icons/192"];
const FOREGROUND_PUSH_EVENT = "solvio:push:foreground";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: "reload" }));
          } catch (error) {
            console.error("Failed to precache asset:", url, error);
          }
        })
      );
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function shouldCacheAsset(request, url) {
  if (url.origin !== self.location.origin) {
    return false;
  }

  if (url.pathname.startsWith("/_next/")) {
    return false;
  }

  if (url.pathname.startsWith("/pwa-icons/")) {
    return true;
  }

  if (url.pathname === "/manifest.webmanifest") {
    return true;
  }

  return ["font", "image"].includes(request.destination);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cachedOfflinePage = await caches.match(OFFLINE_URL);
          return cachedOfflinePage || Response.error();
        }
      })()
    );
    return;
  }

  if (!shouldCacheAsset(request, url)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          if (response.ok) {
            void cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => undefined);

      return cached || networkFetch || Response.error();
    })()
  );
});

function parsePushPayload(data) {
  if (!data) {
    return {};
  }

  try {
    return data.json();
  } catch {
    return {
      title: "New notification",
      body: data.text(),
    };
  }
}

function normalizePushPayload(payload) {
  const data = payload.data && typeof payload.data === "object" ? payload.data : {};
  const url = payload.url || data.url || "/";

  return {
    title: payload.title || "New notification",
    body: payload.body || "You have a new update.",
    icon: payload.icon || "/pwa-icons/192",
    badge: payload.badge || "/pwa-icons/192",
    tag: payload.tag || payload.notificationId || "solvio-notification",
    notificationId: payload.notificationId || null,
    data: {
      ...data,
      url,
      notificationId: payload.notificationId || null,
    },
  };
}

async function notifyVisibleClients(payload) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const localClients = clients.filter((client) => {
    try {
      return new URL(client.url).origin === self.location.origin;
    } catch {
      return false;
    }
  });

  const visibleClients = localClients.filter(
    (client) => client.visibilityState === "visible"
  );

  if (visibleClients.length === 0) {
    return false;
  }

  const targetClient =
    visibleClients.find((client) => client.focused) || visibleClients[0];

  targetClient.postMessage({
    type: FOREGROUND_PUSH_EVENT,
    payload,
  });

  return true;
}

self.addEventListener("push", (event) => {
  const payload = normalizePushPayload(parsePushPayload(event.data));

  event.waitUntil(
    (async () => {
      const handledInForeground = await notifyVisibleClients(payload);
      if (handledInForeground) {
        return;
      }

      await self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon,
        badge: payload.badge,
        tag: payload.tag,
        data: payload.data,
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  ).href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin !== self.location.origin) {
          continue;
        }

        if ("focus" in client) {
          await client.focus();
        }

        if ("navigate" in client && client.url !== targetUrl) {
          await client.navigate(targetUrl);
        }

        return;
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});
