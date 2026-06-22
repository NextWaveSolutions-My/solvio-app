"use client";

import { Logo } from "@/components/ui/logo";

export function AuthHeader() {
  return (
    <div className="flex flex-col items-center mb-8">
      <div className="mb-4">
        <Logo width={200} height={60} className="h-12 w-auto object-contain" />
      </div>
    </div>
  );
}
