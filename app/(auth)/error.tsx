"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Auth Routes Error Boundary
 * Catches errors in authentication routes (login, register)
 */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Authentication error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              An error occurred during authentication. Please try again or contact support if the problem persists.
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
            </div>
          )}

          {error.digest && (
            <p className="text-xs text-center text-muted-foreground">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button onClick={() => reset()} className="gap-2 w-full">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/" className="gap-2">
                <Home className="h-4 w-4" />
                Go to homepage
              </Link>
            </Button>
          </div>

          <div className="pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground">
              Need help? <Link href="/dashboard/tickets/new" className="text-primary hover:underline">Contact support</Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

