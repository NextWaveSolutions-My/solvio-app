"use client";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User } from "lucide-react";
import { useSidebarCollapsed } from "@/components/layout/app-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NameWithRole } from "@/components/shared/name-with-role";

interface UserMenuProps {
  user: {
    name: string;
    email: string;
    role: string;
    image?: string;
  };
  variant?: "header" | "sidebar";
}

export function UserMenu({ user, variant = "header" }: UserMenuProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  // Use user.image directly, but allow override from custom event
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | undefined>();
  const collapsed = useSidebarCollapsed();

  // Listen for avatar updates broadcast by the profile page upload
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const ce = e as CustomEvent<{ url?: string }>;
        if (ce.detail?.url) setCustomAvatarUrl(ce.detail.url);
      } catch {}
    };
    if (typeof window !== "undefined") {
      window.addEventListener("app:avatar-updated", handler as EventListener);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(
          "app:avatar-updated",
          handler as EventListener,
        );
      }
    };
  }, []);

  // Use custom avatar if available, otherwise fall back to user.image
  const avatarUrl = customAvatarUrl ?? user.image;
  // Profile path is role-based
  const profilePath =
    user.role === "admin"
      ? "/admin/profile"
      : user.role === "support"
        ? "/support-agent/profile"
        : "/dashboard/profile";

  // Settings path only available for admin
  const settingsPath = user.role === "admin" ? "/admin/settings" : null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      toast.success("Signed out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
      setIsLoading(false);
    }
  };

  if (variant === "sidebar") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2 transition-colors",
              collapsed
                ? "min-h-[3.35rem] flex-col justify-center gap-0.5 rounded-[0.9rem] p-1.5 bg-transparent hover:bg-slate-50"
                : "bg-muted/90 hover:bg-muted",
            )}
          >
            <Avatar
              className={cn(
                "h-8 w-8",
                collapsed &&
                  "h-7 w-7 border-0 bg-transparent shadow-none",
              )}
            >
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback className="text-xs">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            {collapsed ? (
              <span className="text-center text-[9px] font-medium leading-3 text-slate-500">
                Account
              </span>
            ) : (
              <div className="flex-1 text-left">
                <NameWithRole
                  name={user.name}
                  role={user.role}
                  className="text-sm font-medium text-foreground"
                  badgeClassName="h-4 px-2 text-[10px]"
                />
              </div>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <NameWithRole
                name={user.name}
                role={user.role}
                className="text-sm font-medium leading-none"
                badgeClassName="h-4 px-2 text-[10px]"
              />
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(profilePath)}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={!settingsPath}
            onClick={() => settingsPath && router.push(settingsPath)}
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoading ? "Signing out..." : "Sign out"}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar>
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={user.name} /> : null}
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <NameWithRole
              name={user.name}
              role={user.role}
              className="text-sm font-medium leading-none"
              badgeClassName="h-4 px-2 text-[10px]"
            />
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(profilePath)}>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!settingsPath}
          onClick={() => settingsPath && router.push(settingsPath)}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
