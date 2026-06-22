import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion, Home } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you're looking for doesn't exist.",
};

/**
 * Root Not Found Page
 * Displayed when a route doesn't exist
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="space-y-2">
            <p className="text-6xl font-bold text-muted-foreground/20">404</p>
            <p className="text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been
              moved.
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link href="/" className="gap-2">
                <Home className="h-4 w-4" />
                Go home
              </Link>
            </Button>
            <BackButton />
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Need help?{" "}
              <Link
                href="/dashboard/tickets/new"
                className="text-primary hover:underline"
              >
                Contact support
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
