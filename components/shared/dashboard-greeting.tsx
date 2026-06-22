"use client";

import { useEffect, useState } from "react";

import { getFirstName, getGreeting } from "@/lib/greeting";

interface DashboardGreetingProps {
  /** Full name of the signed-in user; only the first name is shown. */
  name?: string | null;
  /** Supporting copy shown beneath the greeting. */
  subtitle?: string;
  /**
   * Greeting computed on the server (server local time) used for the first
   * paint, then corrected to the visitor's local time after hydration.
   */
  initialGreeting: string;
}

export function DashboardGreeting({
  name,
  subtitle,
  initialGreeting,
}: DashboardGreetingProps) {
  const [greeting, setGreeting] = useState(initialGreeting);

  // Recompute against the visitor's local time so the greeting is correct
  // regardless of the server's timezone.
  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const firstName = getFirstName(name);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {greeting}
        {firstName ? `, ${firstName}` : ""}.
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
