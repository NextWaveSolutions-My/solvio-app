"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ArrowRight, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Logo } from "@/components/ui/logo";
import { usePathname } from "next/navigation";
import type { SessionUser } from "@/lib/auth";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/layout/user-menu";
import type { HeaderSection } from "@/types/landing-page";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useWhatsAppSettings } from "@/components/providers/settings-provider";

interface PublicHeaderProps {
  variant?: "landing" | "auth";
  header?: HeaderSection;
}

const defaultHeader: HeaderSection = {
  navigationLinks: [
    { label: "Overview", href: "/#overview" },
    { label: "Support Paths", href: "/#support-paths" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Features", href: "/#features" },
    { label: "FAQ", href: "/#faq" },
    { label: "Contact", href: "/#contact" },
  ],
  signInText: "Sign In",
  ctaButtonText: "Create Ticket",
  ctaButtonLink: "/dashboard/tickets/new",
  mobileCtaText: "Open Support",
};

export function PublicHeader({ header }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentHash, setCurrentHash] = useState("");
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const whatsapp = useWhatsAppSettings();

  const h = header ?? defaultHeader;

  // WhatsApp shows in the header only when the admin enabled it in settings.
  const whatsappUrl =
    whatsapp?.enabled && whatsapp.phoneNumber
      ? `https://wa.me/${whatsapp.phoneNumber
          .replace(/[^\d+]/g, "")
          .replace("+", "")}?text=${encodeURIComponent(
          whatsapp.defaultMessage || "Hello! I have a question.",
        )}`
      : null;
  // Guests can't reach the authenticated /dashboard/tickets/new form, so the
  // CTA sends them to the public ticket page instead. Signed-in users keep the
  // configured link.
  const guestCtaLink = "/support/new";

  // Handle scroll effect for sticky header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const navigationLinks = h.navigationLinks;
  const normalizePath = (path: string) => {
    if (!path || path === "/") return "/";
    return path.endsWith("/") ? path.slice(0, -1) : path;
  };
  const getHashFromHref = (href: string) => {
    const hashIndex = href.indexOf("#");
    return hashIndex >= 0 ? href.slice(hashIndex) : "";
  };

  const isLinkActive = (href: string, index: number) => {
    if (
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:")
    ) {
      return false;
    }

    const [pathPart, hashPart] = href.split("#");
    const linkPath = normalizePath(pathPart || "/");
    const activePath = normalizePath(pathname);
    const linkHash = hashPart ? `#${hashPart}` : "";

    if (linkHash) {
      return (
        activePath === linkPath &&
        (currentHash === linkHash || (!currentHash && index === 0))
      );
    }

    if (linkPath === "/") {
      return activePath === "/" && currentHash === "";
    }

    return activePath === linkPath || activePath.startsWith(`${linkPath}/`);
  };

  const elevated = scrolled || mobileMenuOpen;

  return (
    <header className="sticky top-0 z-50 w-full px-3 pt-3 sm:px-4">
      {/* Floating glass pill */}
      <div
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-2xl border px-3 transition-all duration-300 sm:px-4",
          elevated
            ? "border-border/60 bg-background/80 shadow-lg shadow-black/5 backdrop-blur-xl dark:bg-background/70"
            : "border-transparent bg-transparent"
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <Logo
            width={100}
            height={40}
            className="h-7 w-auto"
            showFallbackText
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navigationLinks.map((link, i) => {
            const active = isLinkActive(link.href, i);

            return (
              <Link
                key={`${link.href}-${i}`}
                href={link.href}
                onClick={() => setCurrentHash(getHashFromHref(link.href))}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {/* WhatsApp (admin-enabled) */}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Message us on WhatsApp"
              title="Message us on WhatsApp"
              className="inline-flex shrink-0 items-center justify-center transition-transform hover:scale-110 active:scale-95"
            >
              <Image
                src="/whatsapp.png"
                alt="WhatsApp"
                width={28}
                height={28}
                className="h-7 w-7"
              />
            </a>
          )}

          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeToggle withLabel={false} />
          </div>

          {/* Auth Buttons or User Menu */}
          {isPending ? (
            <div className="h-9 w-24 animate-pulse rounded-full bg-muted/50" />
          ) : session?.user ? (
            <div className="hidden items-center gap-2 md:flex">
              {/* Show Create Ticket for clients/customers */}
              {(session.user as SessionUser).role !== "admin" &&
                (session.user as SessionUser).role !== "support" && (
                  <Button
                    size="sm"
                    className="group h-9 rounded-full px-4 text-[13.5px] font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
                    asChild
                  >
                    <Link href={h.ctaButtonLink}>
                      {h.ctaButtonText}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                )}
              <UserMenu
                user={{
                  name: session.user.name ?? "Unknown User",
                  email: session.user.email ?? "",
                  role: (session.user as SessionUser).role ?? "customer",
                  image: (session.user as SessionUser).image ?? "",
                }}
                variant="header"
              />
            </div>
          ) : (
            <div className="hidden items-center gap-1.5 md:flex">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-full border-border/80 bg-background/60 px-4 text-[13.5px] font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/40 hover:bg-muted/60"
                asChild
              >
                <Link href="/login">{h.signInText}</Link>
              </Button>
              <Button
                size="sm"
                className="group h-9 rounded-full px-4 text-[13.5px] font-semibold shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/25 active:scale-[0.98]"
                asChild
              >
                <Link href={guestCtaLink}>
                  {h.ctaButtonText}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="rounded-full md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-4.5 w-4.5" />
            ) : (
              <Menu className="h-4.5 w-4.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mx-auto mt-2 max-w-6xl rounded-2xl border border-border/60 bg-background/95 p-4 shadow-xl backdrop-blur-xl md:hidden">
          {/* Mobile Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navigationLinks.map((link, i) => {
              const active = isLinkActive(link.href, i);

              return (
                <Link
                  key={`${link.href}-${i}`}
                  href={link.href}
                  onClick={() => {
                    setCurrentHash(getHashFromHref(link.href));
                    setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/75 hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile Theme Toggle */}
          <div className="px-2 py-2 sm:hidden">
            <ThemeToggle withLabel={true} />
          </div>

          {/* Mobile Auth Buttons or User Info */}
          {!isPending && (
            <div className="mt-3 border-t border-border/60 pt-3">
              {session?.user ? (
                <div className="space-y-2.5">
                  <div className="rounded-xl bg-muted/40 px-3.5 py-2.5">
                    <p className="text-[13px] font-semibold text-foreground">
                      {session.user.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {session.user.email}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl text-[13px]"
                    asChild
                  >
                    <Link
                      href={
                        (session.user as SessionUser).role === "admin" ||
                        (session.user as SessionUser).role === "support"
                          ? "/admin"
                          : "/dashboard"
                      }
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Go to Dashboard
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl text-[13px]"
                    asChild
                  >
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      {h.signInText}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="w-full rounded-xl text-[13px]"
                    asChild
                  >
                    <Link
                      href={guestCtaLink}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {h.mobileCtaText}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
