"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  registerPwaServiceWorker,
  unregisterPwaServiceWorker,
} from "@/lib/pwa/client";

const DEV_SW_RESET_KEY = "__solvio_dev_sw_reset__";
const OFFLINE_RETURN_TO_KEY = "__solvio_offline_return_to__";
const DEV_PWA_ENABLED = process.env.NEXT_PUBLIC_ENABLE_DEV_PWA === "true";

export function PwaBootstrap() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const hasRefreshedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof navigator === "undefined") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    let active = true;

    const isOnlineReachable = async () => {
      try {
        await fetch(`/?__online_check=${Date.now()}`, {
          method: "HEAD",
          cache: "no-store",
        });
        return true;
      } catch {
        return false;
      }
    };

    const syncOfflineState = async () => {
      if (!active) {
        return;
      }

      let offline = !navigator.onLine;

      if (offline) {
        const reachable = await isOnlineReachable();
        offline = !reachable;
      }

      if (!active) {
        return;
      }

      setIsOffline(offline);

      if (offline && window.location.pathname !== "/offline") {
        window.sessionStorage.setItem(
          OFFLINE_RETURN_TO_KEY,
          `${window.location.pathname}${window.location.search}${window.location.hash}`
        );
        window.location.replace("/offline");
        return;
      }

      if (!offline && window.location.pathname === "/offline") {
        const fallbackPath = "/";
        const returnTo =
          window.sessionStorage.getItem(OFFLINE_RETURN_TO_KEY) || fallbackPath;

        window.sessionStorage.removeItem(OFFLINE_RETURN_TO_KEY);
        window.location.replace(returnTo);
      }
    };

    const monitorRegistration = (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration;

      if (registration.waiting && navigator.serviceWorker.controller) {
        setHasUpdate(true);
      }

      const watchInstallingWorker = () => {
        const installingWorker = registration.installing;

        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener("statechange", () => {
          if (
            active &&
            installingWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setHasUpdate(true);
          }
        });
      };

      registration.addEventListener("updatefound", watchInstallingWorker);
      watchInstallingWorker();
    };

    const register = async () => {
      try {
        if (process.env.NODE_ENV !== "production" && !DEV_PWA_ENABLED) {
          const removed = await unregisterPwaServiceWorker();

          if (
            active &&
            removed &&
            navigator.serviceWorker.controller &&
            !window.sessionStorage.getItem(DEV_SW_RESET_KEY)
          ) {
            window.sessionStorage.setItem(DEV_SW_RESET_KEY, "1");
            window.location.reload();
          }

          return;
        }

        const registration = await registerPwaServiceWorker();

        if (active && registration) {
          monitorRegistration(registration);
          await registration.update();

          if (registration.waiting && navigator.serviceWorker.controller) {
            setHasUpdate(true);
          }
        }
      } catch (error) {
        console.error("Failed to register service worker:", error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && registrationRef.current) {
        void registrationRef.current
          .update()
          .then(() => {
            if (
              registrationRef.current?.waiting &&
              navigator.serviceWorker.controller
            ) {
              setHasUpdate(true);
            }
          })
          .catch(() => undefined);
      }
    };

    const handleOffline = () => {
      void syncOfflineState();
    };

    const handleOnline = () => {
      void syncOfflineState();
    };

    const handleControllerChange = () => {
      if (hasRefreshedRef.current) {
        return;
      }

      hasRefreshedRef.current = true;
      window.location.reload();
    };

    void register();
    void syncOfflineState();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    return () => {
      active = false;

      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          handleControllerChange
        );
      }
    };
  }, []);

  const handleReloadUpdate = () => {
    setIsReloading(true);

    const waitingWorker = registrationRef.current?.waiting;

    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      return;
    }

    window.location.reload();
  };

  if (!hasUpdate && !isOffline) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[100] flex items-center gap-2 max-sm:flex-col max-sm:items-end">
      {isOffline && (
        <div className="pointer-events-auto inline-flex items-center rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground shadow-lg">
          Offline
        </div>
      )}

      {hasUpdate && (
        <>
          <div className="pointer-events-auto inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow-lg">
            App update available
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleReloadUpdate}
            disabled={isReloading}
            className="pointer-events-auto rounded-full px-3"
          >
            {isReloading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reloading...
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Reload app
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}