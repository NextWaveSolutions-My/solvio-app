import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion, Home } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The dashboard page you're looking for doesn't exist.",
};

/**
 * Dashboard Routes Not Found Page
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8">
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
              <Link href="/dashboard" className="gap-2">
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <BackButton />
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">Quick links:</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              <Link
                href="/dashboard/tickets"
                className="text-xs text-primary hover:underline"
              >
                My Tickets
              </Link>
              <span className="text-xs text-muted-foreground">•</span>
              <Link
                href="/dashboard/tickets/new"
                className="text-xs text-primary hover:underline"
              >
                New Ticket
              </Link>
              <span className="text-xs text-muted-foreground">•</span>
              <Link
                href="/dashboard/customization"
                className="text-xs text-primary hover:underline"
              >
                Customization
              </Link>
              <span className="text-xs text-muted-foreground">•</span>
              <Link
                href="/dashboard/installation"
                className="text-xs text-primary hover:underline"
              >
                Installation
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
