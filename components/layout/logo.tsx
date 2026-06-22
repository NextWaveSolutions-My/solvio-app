"use client";

import { Logo as LogoComponent } from "@/components/ui/logo";

interface LayoutLogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export function LayoutLogo({
  width = 120,
  height = 40,
  className = "h-8 w-auto object-contain",
}: LayoutLogoProps) {
  return (
    <LogoComponent
      width={width}
      height={height}
      className={className}
      showFallbackText={true}
    />
  );
}

