"use client";

import { useEffect, useState, createContext, useContext } from "react";
import type React from "react";
import Image from "next/image";

import { LayoutLogo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { useFaviconUrl } from "@/components/providers/settings-provider";
import { cn } from "@/lib/utils";

const SidebarCollapseContext = createContext<boolean>(false);

export function useSidebarCollapsed() {
  return useContext(SidebarCollapseContext);
}

export function toggleSidebarEvent() {
  window.dispatchEvent(new CustomEvent("app:toggle-sidebar"));
}

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
    image?: string;
  };
  children: React.ReactNode;
  footerExtra?: React.ReactNode;
  variant?: "default" | "dashboard";
}

export function AppSidebar({
  user,
  children,
  footerExtra,
  variant = "default",
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isDashboard = variant === "dashboard";
  const faviconUrl = useFaviconUrl();

  const asideClasses = cn(
    "flex shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-xl transition-[width] duration-300",
    isDashboard ? "h-full" : "sticky top-0 h-dvh overflow-hidden",
    collapsed ? "w-[5.25rem]" : "w-64"
  );

  const navWrapperClasses = isDashboard
    ? cn("sidebar-scroll flex-1", collapsed ? "px-1.5 py-3" : "p-4")
    : "sidebar-scroll flex-1";
  const headerClasses = cn(
    "shrink-0 border-b border-sidebar-border/70 flex h-14 items-center",
    collapsed ? "justify-center px-2.5" : "px-4"
  );
  const logoWrapperClasses = cn(
    "flex items-center gap-2 overflow-hidden",
    collapsed ? "max-w-10 shrink-0 justify-center" : "flex-1"
  );

  useEffect(() => {
    const handleToggle = () => setCollapsed((prev) => !prev);
    window.addEventListener("app:toggle-sidebar", handleToggle);
    return () => window.removeEventListener("app:toggle-sidebar", handleToggle);
  }, []);

  return (
    <SidebarCollapseContext.Provider value={collapsed}>
      <aside className={asideClasses}>
        <div className={headerClasses}>
          <div className={logoWrapperClasses}>
            {collapsed ? (
              faviconUrl ? (
                <Image
                  src={faviconUrl}
                  alt="Logo"
                  width={32}
                  height={32}
                  className="h-7 w-7 shrink-0 object-contain"
                />
              ) : (
                <LayoutLogo
                  width={40}
                  height={40}
                  className="h-7 w-7 shrink-0 object-contain"
                />
              )
            ) : (
              <LayoutLogo
                width={120}
                height={40}
                className="h-8 w-auto shrink-0 object-contain"
              />
            )}
          </div>
        </div>

        <div
          className={cn(
            navWrapperClasses,
            !collapsed && "sidebar-scrollable"
          )}
        >
          {children}
        </div>

        <div
          className={cn(
            "shrink-0 border-t border-sidebar-border/70",
            collapsed ? "p-2" : "space-y-2 p-4"
          )}
        >
          {footerExtra}
          <UserMenu user={user} variant="sidebar" />
        </div>
      </aside>
    </SidebarCollapseContext.Provider>
  );
}
