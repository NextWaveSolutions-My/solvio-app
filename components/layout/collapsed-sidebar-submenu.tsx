"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface CollapsedSidebarSubmenuItem {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}

interface CollapsedSidebarSubmenuProps {
  label: string;
  icon: React.ElementType;
  active: boolean;
  items: CollapsedSidebarSubmenuItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollapsedSidebarSubmenu({
  label,
  icon: Icon,
  active,
  items,
  open,
  onOpenChange,
}: CollapsedSidebarSubmenuProps) {
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const clearCloseTimer = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.top, left: rect.right + 10 });
    }
    onOpenChange(true);
  }, [clearCloseTimer, onOpenChange]);

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    onOpenChange(false);
  }, [clearCloseTimer, onOpenChange]);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimeoutRef.current = setTimeout(() => {
      onOpenChange(false);
    }, 150);
  }, [clearCloseTimer, onOpenChange]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (
        triggerRef.current?.contains(target) ||
        contentRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, closeMenu]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-collapsed-sidebar-submenu-trigger="true"
        onClick={() => {
          if (open) {
            closeMenu();
          } else {
            openMenu();
          }
        }}
        onPointerEnter={openMenu}
        onPointerLeave={scheduleClose}
        className={cn(
          "group relative flex min-h-[3.35rem] w-full flex-col items-center justify-center gap-0.5 rounded-[0.9rem] px-1.5 py-1.75 text-center transition-all duration-200",
          active
            ? "bg-primary/15 text-primary ring-1 ring-primary/40 dark:bg-primary/30 dark:text-primary-foreground dark:ring-primary/60"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
        )}
        aria-label={label}
        aria-expanded={open}
      >
        <Icon
          className={cn(
            "h-[1.05rem] w-[1.05rem] shrink-0 transition-colors",
            active
              ? "text-primary dark:text-primary-foreground"
              : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-200"
          )}
        />
        <span
          className={cn(
            "max-w-full text-[9px] leading-3 font-medium whitespace-normal",
            active
              ? "text-primary dark:text-primary-foreground"
              : "text-slate-500 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-100"
          )}
        >
          {label}
        </span>
        <ChevronRight
          className={cn(
            "pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 shrink-0 -translate-y-1/2 transition-colors",
            active
              ? "text-primary dark:text-primary-foreground"
              : "text-slate-400 dark:text-slate-500"
          )}
        />
      </button>
      {open &&
        createPortal(
          <div
            ref={contentRef}
            data-collapsed-sidebar-submenu-content="true"
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-48 rounded-[1.125rem] border border-border bg-popover/95 p-1.5 shadow-[0_22px_48px_-24px_rgba(15,23,42,0.3)] backdrop-blur-md"
            onPointerEnter={() => {
              clearCloseTimer();
            }}
            onPointerLeave={scheduleClose}
          >
            <div className="space-y-1">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={cn(
                    "group flex min-h-8 items-center rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors",
                    item.active
                      ? "bg-primary/15 text-primary dark:bg-primary/30 dark:text-primary-foreground"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100"
                  )}
                >
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
