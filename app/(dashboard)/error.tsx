"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw, Ticket } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Dashboard Routes Error Boundary
 * Catches errors in user dashboard routes
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Dashboard Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              An error occurred while loading your dashboard. This could be due to
              a temporary issue or a problem with the requested resource.
            </AlertDescription>
          </Alert>

          {process.env.NODE_ENV === "development" && (
            <div className="rounded-lg bg-muted p-4">
              <p className="text-xs font-semibold text-foreground mb-2">
                Development Error Details:
              </p>
              <p className="text-xs font-mono text-destructive break-all">
                {error.message}
              </p>
              {error.stack && (
                <details className="mt-2">
                  <summary className="text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
                    Stack Trace
                  </summary>
                  <pre className="mt-2 text-xs font-mono text-muted-foreground overflow-x-auto">
                    {error.stack}
                  </pre>
                </details>
              )}
            </div>
          )}

          {error.digest && (
            <p className="text-xs text-center text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-center">
            <Button onClick={() => reset()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard" className="gap-2">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground mb-3">
              If this problem persists, you can:
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/tickets/new" className="gap-2">
                  <Ticket className="h-4 w-4" />
                  Create a support ticket
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

