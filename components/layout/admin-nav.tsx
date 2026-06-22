"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Settings,
  Wrench,
  Download,
  Briefcase,
  Package,
  Bolt,
  ChevronDown,
  ChevronRight,
  FileText,
  UserCheck,
  MessageSquare,
  Layout,
  Mail,
  BookOpen,
  Sparkles,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CollapsedSidebarSubmenu } from "@/components/layout/collapsed-sidebar-submenu";
import { usePathname } from "next/navigation";
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

interface AdminNavProps {
  userRole: string;
  services: Array<{
    id: string;
    name: string;
    slug: string;
    href: string;
    iconKey: string;
    roles: string[];
  }>;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
  collapsedLabel?: string;
  children?: NavItem[];
}

function iconForKey(iconKey: string) {
  switch (iconKey) {
    case "wrench":
      return Wrench;
    case "download":
      return Download;
    case "package":
      return Package;
    case "bolt":
      return Bolt;
    default:
      return Briefcase;
  }
}

export function AdminNav({ userRole, services }: AdminNavProps) {
  const collapsed = useSidebarCollapsed();
  const pathname = usePathname();
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

  const serviceChildren: NavItem[] = services
    .filter((service) => service.roles.includes(userRole))
    .map((service) => ({
      name: service.name,
      href: `/admin/services/${service.slug}`,
      icon: iconForKey(service.iconKey),
      roles: service.roles,
    }));

  const navStructure: { section: string; items: NavItem[] }[] = [
    {
      section: "MANAGEMENT",
      items: [
        {
          name: "Dashboard",
          href: "/admin",
          icon: LayoutDashboard,
          roles: ["admin", "support"],
        },
      ],
    },
    {
      section: "SUPPORT",
      items: [
        {
          name: "All Tickets",
          href: "/admin/tickets",
          icon: FileText,
          roles: ["admin", "support"],
          collapsedLabel: "Tickets",
        },
        {
          name: "Messages",
          href: "/admin/messages",
          icon: MessageSquare,
          roles: ["admin", "support"],
        },
         {
          name: "AI Support Agent",
          href: "/admin/ai-support-agent",
          icon: Sparkles,
          roles: ["admin"],
          collapsedLabel: "AI",
        },
        {
          name: "Newsletter",
          href: "/admin/newsletter",
          icon: Mail,
          roles: ["admin"],
          collapsedLabel: "News",
        },
        {
          name: "Contact",
          href: "/admin/contact",
          icon: MessageSquare,
          roles: ["admin"],
          collapsedLabel: "Contact",
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
                href: "/admin/services",
                icon: Briefcase,
                roles: ["admin", "support"],
                children: serviceChildren,
              },
            ],
          },
        ]
      : []),
    {
      section: "CMS",
      items: [
        {
          name: "Landing Page",
          href: "/admin/landing-page",
          icon: Layout,
          roles: ["admin"],
          collapsedLabel: "Landing",
        },
        {
          name: "Knowledge Base",
          href: "/admin/knowledge-base",
          icon: BookOpen,
          roles: ["admin"],
          collapsedLabel: "Docs",
        }
      ],
    },
    {
      section: "ADMINISTRATION",
      items: [
        {
          name: "Customers",
          href: "/admin/customers",
          icon: UserCheck,
          roles: ["admin", "support"],
        },
        {
          name: "Team Members",
          href: "/admin/users",
          icon: Users,
          roles: ["admin"],
          collapsedLabel: "Team",
        },
        {
          name: "Settings",
          href: "/admin/settings",
          icon: Settings,
          roles: ["admin"],
        },
      ],
    },
  ];

  const renderNavItem = (
    item: {
      name: string;
      href: string;
      icon: React.ElementType;
      collapsedLabel?: string;
    },
    isChild = false
  ) => {
    const Icon = item.icon;
    const collapsedLabel = item.collapsedLabel ?? item.name;
    const isActive =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);

    if (collapsed) {
      return (
        <Link
          key={item.href}
          href={item.href}

          className={cn(
            collapsedNavItemClasses,
            isActive
              ? activeCollapsedItemClasses
              : inactiveCollapsedItemClasses
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
      {navStructure.map((section) => {
        // Filter items based on user role
        const filteredItems = section.items.filter((item) =>
          item.roles.includes(userRole)
        );

        if (filteredItems.length === 0) return null;

        return (
          <div key={section.section} className={cn("space-y-1", collapsed && "space-y-1")}>
            {!collapsed && (
              <h3 className="px-3 text-[11px] leading-4 font-semibold text-muted-foreground/80 uppercase tracking-[0.08em]">
                {section.section}
              </h3>
            )}
            <div className={cn(collapsed ? "space-y-1" : "mt-2 space-y-1")}>
              {filteredItems.map((item) => {
                if (item.children) {
                  const visibleChildren = item.children.filter((child) =>
                    child.roles.includes(userRole)
                  );
                  if (visibleChildren.length === 0) return null;

                  const hasActiveChild = visibleChildren.some(
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
                        items={visibleChildren.map((child) => ({
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
                          <SubmenuChain count={visibleChildren.length} />
                          {visibleChildren.map((child) =>
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
        );
      })}
    </nav>
  );
}
