"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Home,
  Ticket,
  Plus,
  Wrench,
  Download,
  ChevronDown,
  ChevronRight,
  FileText,
  User,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSidebarCollapsed } from "@/components/layout/app-sidebar";
import { CollapsedSidebarSubmenu } from "@/components/layout/collapsed-sidebar-submenu";
import {
  SubmenuChain,
  expandedNavItemClasses,
  expandedChildNavItemClasses,
  expandedNavTriggerClasses,
  activeExpandedItemClasses,
  activeExpandedParentItemClasses,
  activeExpandedChildItemClasses,
  inactiveExpandedItemClasses,
  inactiveExpandedChildItemClasses,
  collapsedNavItemClasses,
  activeCollapsedItemClasses,
  inactiveCollapsedItemClasses,
  activeIconClasses,
  inactiveIconClasses,
} from "@/components/layout/sidebar-nav-shared";

type NavItemWithHref = {
  title: string;
  href: string;
  icon: LucideIcon;
  collapsedLabel?: string;
  activeMatch?: "exact" | "prefix";
  excludeActivePrefixes?: string[];
  children?: never;
};

type NavItemWithChildren = {
  title: string;
  icon: LucideIcon;
  children: NavItemWithHref[];
  href?: never;
};

type NavItem = NavItemWithHref | NavItemWithChildren;

type NavSection = {
  section: string;
  items: NavItem[];
};

function iconForKey(iconKey: string) {
  switch (iconKey) {
    case "wrench":
      return Wrench;
    case "download":
      return Download;
    default:
      return Briefcase;
  }
}

export function DashboardNav({
  services,
}: {
  services: Array<{ id: string; name: string; slug: string; iconKey: string }>;
}) {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Tickets: true,
  });
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  const profileItem: NavItemWithHref = {
    title: "Profile",
    href: "/dashboard/profile",
    icon: User,
  };

  const serviceChildren: NavItemWithHref[] = services.map((s) => ({
    title: s.name,
    href: `/dashboard/services/${s.slug}`,
    icon:
      s.slug === "customization"
        ? Wrench
        : s.slug === "installation"
          ? Download
          : iconForKey(s.iconKey),
  }));

  const navStructure: NavSection[] = [
    {
      section: "OVERVIEW",
      items: [
        {
          title: "Dashboard",
          href: "/dashboard",
          icon: Home,
        },
      ],
    },
    {
      section: "SUPPORT",
      items: [
        {
          title: "Tickets",
          icon: Ticket,
          children: [
            {
              title: "All Tickets",
              href: "/dashboard/tickets",
              icon: FileText,
              collapsedLabel: "Tickets",
              excludeActivePrefixes: ["/dashboard/tickets/new"],
            },
            {
              title: "New Ticket",
              href: "/dashboard/tickets/new",
              icon: Plus,
              activeMatch: "exact" as const,
            },
          ],
        },
        {
          title: "Messages",
          href: "/dashboard/messages",
          icon: MessageSquare,
        },
      ],
    },
    ...(serviceChildren.length > 0
      ? [
          {
            section: "SERVICES",
            items: [
              {
                title: "Services",
                icon: Briefcase,
                children: serviceChildren,
              },
            ],
          },
        ]
      : []),
  ];

  const isHrefActive = (item: NavItemWithHref) => {
    const matchMode = item.activeMatch ?? "prefix";
    const isActive =
      pathname === item.href ||
      (matchMode === "prefix" && pathname.startsWith(`${item.href}/`));

    if (!isActive) return false;

    if (item.excludeActivePrefixes?.length) {
      for (const excludedHref of item.excludeActivePrefixes) {
        if (
          pathname === excludedHref ||
          pathname.startsWith(`${excludedHref}/`)
        ) {
          return false;
        }
      }
    }

    return true;
  };

  const setSectionOpen = (title: string, nextOpen: boolean) => {
    setOpenSections((prev) => {
      if (!nextOpen) {
        return {
          ...prev,
          [title]: false,
        };
      }

      const nextState: Record<string, boolean> = {};
      for (const key of Object.keys(prev)) {
        nextState[key] = false;
      }

      nextState[title] = true;
      return nextState;
    });
  };

  const renderNavItem = (item: NavItemWithHref, isChild = false) => {
    const Icon = item.icon;
    const collapsedLabel = item.collapsedLabel ?? item.title;
    const isActive =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : isHrefActive(item);

    if (collapsed) {
      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            collapsedNavItemClasses,
            isActive ? activeCollapsedItemClasses : inactiveCollapsedItemClasses
          )}
        >
          <Icon
            className={cn(
              "h-[1.05rem] w-[1.05rem] shrink-0 transition-colors",
              isActive ? activeIconClasses : inactiveIconClasses
            )}
          />
          <span
            className={cn(
              "max-w-full text-center text-[9px] font-medium leading-3 tracking-normal whitespace-normal",
              isActive
                ? "text-primary dark:text-primary-foreground"
                : "text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-100"
            )}
          >
            {collapsedLabel}
          </span>
        </Link>
      );
    }

    if (isChild) {
      return (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            expandedChildNavItemClasses,
            isActive
              ? activeExpandedChildItemClasses
              : inactiveExpandedChildItemClasses
          )}
        >
          <span className="truncate">{item.title}</span>
        </Link>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          expandedNavItemClasses,
          isActive ? activeExpandedItemClasses : inactiveExpandedItemClasses
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            isActive ? activeIconClasses : inactiveIconClasses
          )}
        />
        <span className={cn("truncate", collapsed && "sr-only")}>
          {item.title}
        </span>
      </Link>
    );
  };

  return (
    <nav className={cn("space-y-4", collapsed && "space-y-2")}>
      {navStructure.map((section) => (
        <div key={section.section} className={cn("space-y-1", collapsed && "space-y-1")}>
          {!collapsed && (
            <h3 className="px-3 text-[11px] leading-4 font-semibold text-muted-foreground/80 uppercase tracking-[0.08em]">
              {section.section}
            </h3>
          )}
          <div className={cn(collapsed ? "space-y-1" : "mt-2 space-y-1")}>
            {section.items.map((item) => {
              if (item.children) {
                const hasActiveChild = item.children.some((child) =>
                  isHrefActive(child)
                );
                const isOpen = openSections[item.title] ?? hasActiveChild;
                const Icon = item.icon;

                if (collapsed) {
                  return (
                    <CollapsedSidebarSubmenu
                      key={item.title}
                      label={item.title}
                      icon={Icon}
                      active={hasActiveChild}
                      open={activeFlyout === item.title}
                      onOpenChange={(open) =>
                        setActiveFlyout(open ? item.title : null)
                      }
                      items={item.children.map((child) => ({
                        href: child.href,
                        label: child.title,
                        icon: child.icon,
                        active: isHrefActive(child),
                      }))}
                    />
                  );
                }

                return (
                  <Collapsible
                    key={item.title}
                    open={isOpen}
                    onOpenChange={(nextOpen) =>
                      setSectionOpen(item.title, nextOpen)
                    }
                  >
                    <CollapsibleTrigger
                      className={cn(
                        expandedNavTriggerClasses,
                        collapsed && "justify-center gap-0 px-2",
                        hasActiveChild
                          ? activeExpandedParentItemClasses
                          : inactiveExpandedItemClasses
                      )}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-3",
                          collapsed && "w-auto justify-center gap-0"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            hasActiveChild
                              ? activeIconClasses
                              : inactiveIconClasses
                          )}
                        />
                        <span
                          className={cn("truncate", collapsed && "sr-only")}
                        >
                          {item.title}
                        </span>
                      </div>
                      {!collapsed && (
                        <>
                          {isOpen ? (
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0",
                                hasActiveChild
                                  ? activeIconClasses
                                  : "text-slate-400 dark:text-slate-500"
                              )}
                            />
                          ) : (
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 shrink-0",
                                hasActiveChild
                                  ? activeIconClasses
                                  : "text-slate-400 dark:text-slate-500"
                              )}
                            />
                          )}
                        </>
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-1">
                      <div className="relative ml-5 space-y-1 py-0.5 pl-5">
                        <SubmenuChain count={item.children.length} />
                        {item.children.map((child) =>
                          renderNavItem(child, true)
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }
              return renderNavItem(item);
            })}
          </div>
        </div>
      ))}

      {/* Account Section */}
      <div className={cn("space-y-1", collapsed && "space-y-1")}>
        {!collapsed && (
          <h3 className="px-3 text-[11px] leading-4 font-semibold text-muted-foreground/80 uppercase tracking-[0.08em]">
            ACCOUNT
          </h3>
        )}
        <div className={cn(collapsed ? "space-y-1" : "mt-2 space-y-1")}>
          {renderNavItem(profileItem)}
        </div>
      </div>
    </nav>
  );
}
