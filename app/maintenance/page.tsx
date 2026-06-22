import Link from "next/link";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSystemSettings } from "@/lib/settings-utils";

export const dynamic = "force-dynamic";

export default async function MaintenancePage() {
  const settings = await getSystemSettings();
  const message =
    settings.maintenance?.message ||
    "We’re performing maintenance right now. Please check back soon.";
  const siteName = settings.general?.siteName || "Support";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning/15">
            <Wrench className="h-8 w-8 text-warning" />
          </div>
          <CardTitle className="text-2xl">{siteName} is under maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">{message}</p>
          <div className="flex gap-2 justify-center pt-4">
            <Button asChild variant="outline">
              <Link href="/login">Go to Login</Link>
            </Button>
            <Button asChild>
              <Link href="/">Go Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

