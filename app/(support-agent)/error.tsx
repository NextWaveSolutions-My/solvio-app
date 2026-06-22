"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Headset, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Support Agent Routes Error Boundary
 * Catches errors in support agent routes
 */
export default function SupportAgentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Support agent panel error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Support Agent Panel Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              An error occurred while loading the support agent panel. This could be due
              to a temporary issue or a problem with the requested resource.
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
              <Link href="/support-agent" className="gap-2">
                <Headset className="h-4 w-4" />
                Support Dashboard
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              If this problem persists, please check the server logs or contact
              the system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

