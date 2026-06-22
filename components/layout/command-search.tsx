"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Mail,
  Briefcase,
  Layout,
  BookOpen,
  UserCheck,
  Users,
  Settings,
  Ticket,
  Plus,
  User,
  Home,
  type LucideIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface NavPage {
  name: string;
  href: string;
  icon: LucideIcon;
  section: string;
}

function getAdminPages(role: string): NavPage[] {
  const pages: (NavPage & { roles: string[] })[] = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard, section: "Management", roles: ["admin", "support"] },
    { name: "All Tickets", href: "/admin/tickets", icon: FileText, section: "Support", roles: ["admin", "support"] },
    { name: "Messages", href: "/admin/messages", icon: MessageSquare, section: "Support", roles: ["admin", "support"] },
    { name: "Newsletter", href: "/admin/newsletter", icon: Mail, section: "Support", roles: ["admin"] },
    { name: "Landing Page", href: "/admin/landing-page", icon: Layout, section: "CMS", roles: ["admin"] },
    { name: "Knowledge Base", href: "/admin/knowledge-base", icon: BookOpen, section: "CMS", roles: ["admin"] },
    { name: "Customers", href: "/admin/customers", icon: UserCheck, section: "Administration", roles: ["admin", "support"] },
    { name: "Team Members", href: "/admin/users", icon: Users, section: "Administration", roles: ["admin"] },
    { name: "Settings", href: "/admin/settings", icon: Settings, section: "Administration", roles: ["admin"] },
  ];
  return pages.filter((p) => p.roles.includes(role));
}

function getDashboardPages(): NavPage[] {
  return [
    { name: "Dashboard", href: "/dashboard", icon: Home, section: "Overview" },
    { name: "All Tickets", href: "/dashboard/tickets", icon: FileText, section: "Support" },
    { name: "New Ticket", href: "/dashboard/tickets/new", icon: Plus, section: "Support" },
    { name: "Messages", href: "/dashboard/messages", icon: MessageSquare, section: "Support" },
    { name: "Profile", href: "/dashboard/profile", icon: User, section: "Account" },
  ];
}

function getSupportPages(): NavPage[] {
  return [
    { name: "Dashboard", href: "/support-agent", icon: LayoutDashboard, section: "Overview" },
    { name: "All Tickets", href: "/support-agent/tickets", icon: Ticket, section: "Support" },
    { name: "Messages", href: "/support-agent/messages", icon: MessageSquare, section: "Support" },
  ];
}

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: string;
  services?: Array<{ name: string; slug: string }>;
}

export function CommandSearch({
  open,
  onOpenChange,
  userRole,
  services = [],
}: CommandSearchProps) {
  const router = useRouter();

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  // Build pages based on role
  const isAdmin = userRole === "admin" || userRole === "support";
  const isDashboard = userRole === "customer";
  const isSupport = userRole === "support";

  const pages = isAdmin
    ? getAdminPages(userRole)
    : isDashboard
      ? getDashboardPages()
      : getSupportPages();

  // Build service pages
  const servicePages: NavPage[] = services.map((s) => {
    const basePath = isAdmin ? "/admin" : isDashboard ? "/dashboard" : "/support-agent";
    return {
      name: s.name,
      href: `${basePath}/services/${s.slug}`,
      icon: Briefcase,
      section: "Services",
    };
  });

  // Group pages by section
  const sections = new Map<string, NavPage[]>();
  for (const page of [...pages, ...servicePages]) {
    const group = sections.get(page.section) ?? [];
    group.push(page);
    sections.set(page.section, group);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Array.from(sections.entries()).map(([section, items]) => (
          <CommandGroup key={section} heading={section}>
            {items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${item.name} ${item.section}`}
                onSelect={() =>
                  runCommand(() => router.push(item.href))
                }
              >
                <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{item.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {item.href}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}
