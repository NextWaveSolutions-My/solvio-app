"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Search, Moon, Sun, X, PanelLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useSettings } from "@/components/providers/settings-provider";
import { toggleSidebarEvent } from "@/components/layout/app-sidebar";
import {
  CommandSearch,
  useCommandSearch,
} from "@/components/layout/command-search";

interface AppHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string;
  };
  notificationClickBehavior?: "detail" | "direct";
  services?: Array<{ name: string; slug: string }>;
}

export function AppHeader({
  user,
  notificationClickBehavior = "detail",
  services = [],
}: AppHeaderProps) {
  const { setTheme } = useTheme();
  const { settings } = useSettings();
  const { open: searchOpen, setOpen: setSearchOpen } = useCommandSearch();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [storedDismissedValue, setStoredDismissedValue] = useState<
    string | null
  >(null);

  useEffect(() => {
    const storageKey = "app:announcement-dismissed:v1";
    try {
      setStoredDismissedValue(window.localStorage.getItem(storageKey));
    } catch {
      setStoredDismissedValue(null);
    }
  }, []);

  // Determine notification base path based on user role
  const getNotificationBasePath = () => {
    if (user.role === "admin") {
      return "/admin/notifications";
    } else if (user.role === "support") {
      return "/support-agent/notifications";
    }
    return "/dashboard/notifications";
  };

  return (
    <header className="w-full border-b bg-surface">
      {(() => {
        const maintenanceEnabled = settings.maintenance?.enabled;
        const announcements = settings.announcements;

        const roleKey =
          user.role === "admin"
            ? "admin"
            : user.role === "support"
              ? "support"
              : "dashboard";

        const showAnnouncement =
          !maintenanceEnabled &&
          announcements?.enabled &&
          (announcements.message || "").trim().length > 0 &&
          ((roleKey === "dashboard" && announcements.showOn?.dashboard) ||
            (roleKey === "admin" && announcements.showOn?.admin) ||
            (roleKey === "support" && announcements.showOn?.support));

        const showMaintenance = !!maintenanceEnabled;

        const banner = showMaintenance
          ? {
              title: "Maintenance Mode",
              message:
                settings.maintenance?.message ||
                "We’re performing maintenance right now. Please check back soon.",
              variant: "maintenance" as const,
              dismissible: false,
            }
          : showAnnouncement
            ? {
                title: announcements.title || "What’s new",
                message: announcements.message,
                variant: announcements.variant || ("info" as const),
                dismissible: announcements.dismissible,
              }
            : null;

        if (!banner) return null;

        const storageKey = "app:announcement-dismissed:v1";
        const fingerprint = JSON.stringify(banner);
        const dismissed =
          bannerDismissed || storedDismissedValue === fingerprint;

        if (dismissed) return null;

        const variantClasses =
          banner.variant === "success"
            ? "border-success/20 bg-success/10 text-success"
            : banner.variant === "warning"
              ? "border-warning/20 bg-warning/10 text-warning"
              : banner.variant === "maintenance"
                ? "border-warning/20 bg-warning/10 text-warning"
                : "border-info/20 bg-info/10 text-info";

        return (
          <div className={`border-b ${variantClasses}`}>
            <div className="flex items-start justify-between gap-3 px-4 py-2.5 md:px-6">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{banner.title}</p>
                <p className="text-sm opacity-90 break-words">
                  {banner.message}
                </p>
              </div>
              {banner.dismissible && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    try {
                      window.localStorage.setItem(storageKey, fingerprint);
                      setStoredDismissedValue(fingerprint);
                    } catch {}
                    setBannerDismissed(true);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );
      })()}
      <div className="flex h-14 items-center gap-2 px-3 md:px-4">
        {/* Sidebar Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={toggleSidebarEvent}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-5 w-5 text-muted-foreground" />
        </Button>

        {/* Search Trigger */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-input bg-muted/40 px-2.5 text-muted-foreground transition-colors hover:bg-muted/60"
        >
          <Search className="h-4 w-4 shrink-0" />
          <kbd className="pointer-events-none flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">&#8984;</span>K
          </kbd>
        </button>

        {/* Right Section */}
        <div className="ml-auto flex items-center gap-1">
          {/* Theme Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                <span>Light</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Dark</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <span className="mr-2 h-4 w-4">&#128187;</span>
                <span>System</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <NotificationBell
            userId={user.id}
            userRole={user.role}
            basePath={getNotificationBasePath()}
            clickBehavior={notificationClickBehavior}
          />

          {/* User Menu */}
          <UserMenu user={user} variant="header" />
        </div>
      </div>

      {/* Command Palette */}
      <CommandSearch
        open={searchOpen}
        onOpenChange={setSearchOpen}
        userRole={user.role}
        services={services}
      />
    </header>
  );
}
