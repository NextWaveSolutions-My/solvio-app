"use client";

import { useState } from "react";
import type React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Ticket,
  Wrench,
  Download,
  User,
  MessageSquare,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CollapsedSidebarSubmenu } from "@/components/layout/collapsed-sidebar-submenu";
import { useSidebarCollapsed } from "@/components/layout/app-sidebar";
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

export function SupportAgentNav({
  services,
}: {
  services: Array<{ id: string; name: string; slug: string; iconKey: string }>;
}) {
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);

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

  type NavLinkItem = {
    name: string;
    href: string;
    icon: React.ElementType;
    collapsedLabel?: string;
  };

  type NavGroupItem = {
    name: string;
    icon: React.ElementType;
    children: NavLinkItem[];
  };

  type NavItem = NavLinkItem | NavGroupItem;

  const serviceChildren: NavLinkItem[] = services.map((service) => ({
    name: service.name,
    href: `/support-agent/services/${service.slug}`,
    icon:
      service.slug === "customization"
        ? Wrench
        : service.slug === "installation"
          ? Download
          : iconForKey(service.iconKey),
  }));

  const navStructure: { section: string; items: NavItem[] }[] = [
    {
      section: "OVERVIEW",
      items: [
        {
          name: "Dashboard",
          href: "/support-agent",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      section: "ASSIGNED WORK",
      items: [
        {
          name: "My Tickets",
          href: "/support-agent/tickets",
          icon: Ticket,
          collapsedLabel: "Tickets",
        },
        {
          name: "Messages",
          href: "/support-agent/messages",
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
                name: "Services",
                icon: Briefcase,
                children: serviceChildren,
              },
            ],
          },
        ]
      : []),
    {
      section: "ACCOUNT",
      items: [
        {
          name: "Profile",
          href: "/support-agent/profile",
          icon: User,
        },
      ],
    },
  ];

  const renderNavItem = (item: NavLinkItem, isChild = false) => {
    const Icon = item.icon;
    const collapsedLabel = item.collapsedLabel ?? item.name;
    const isActive =
      item.href === "/support-agent"
        ? pathname === "/support-agent"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
          <span className="truncate">{item.name}</span>
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
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className={cn(
        "space-y-4",
        collapsed ? "px-1 py-2.5 space-y-2" : "p-4"
      )}
    >
      {navStructure.map((section) => (
        <div key={section.section} className={cn("space-y-1", collapsed && "space-y-1")}>
          {!collapsed && (
            <h3 className="px-3 text-[11px] leading-4 font-semibold text-muted-foreground/80 uppercase tracking-[0.08em]">
              {section.section}
            </h3>
          )}
          <div className={cn(collapsed ? "space-y-1" : "mt-2 space-y-1")}>
            {section.items.map((item) => {
              if ("children" in item) {
                const hasActiveChild = item.children.some(
                  (child) =>
                    pathname === child.href ||
                    pathname.startsWith(`${child.href}/`)
                );
                const isOpen = openSections[item.name] ?? hasActiveChild;
                const Icon = item.icon;

                if (collapsed) {
                  return (
                    <CollapsedSidebarSubmenu
                      key={item.name}
                      label={item.name}
                      icon={Icon}
                      active={hasActiveChild}
                      open={activeFlyout === item.name}
                      onOpenChange={(open) =>
                        setActiveFlyout(open ? item.name : null)
                      }
                      items={item.children.map((child) => ({
                        href: child.href,
                        label: child.name,
                        icon: child.icon,
                        active:
                          pathname === child.href ||
                          pathname.startsWith(`${child.href}/`),
                      }))}
                    />
                  );
                }

                return (
                  <Collapsible
                    key={item.name}
                    open={isOpen}
                    onOpenChange={(nextOpen) =>
                      setSectionOpen(item.name, nextOpen)
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
                          {item.name}
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
    </nav>
  );
}
