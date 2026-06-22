import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { GuestTicketView } from "@/components/tickets/guest-ticket-view";
import { getPublicLandingContent } from "@/actions/landing-page";
import { getAppMetadata } from "@/lib/settings-utils";
import type { LandingPageContent } from "@/types/landing-page";

export async function generateMetadata(): Promise<Metadata> {
  const app = await getAppMetadata();
  const appName = typeof app.title === "string" ? app.title : "Support";
  return {
    title: `Your Ticket | ${appName}`,
    description: "View the status of your support ticket and reply to our team.",
    robots: { index: false, follow: false },
  };
}

export default async function GuestTicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPublicLandingContent();
  const content = result.data as LandingPageContent;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader variant="landing" header={content?.header} />
      <main className="relative isolate flex-1">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/50 via-background to-background"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/[0.07] to-transparent"
        />
        <GuestTicketView token={token} />
      </main>
      <PublicFooter content={content?.footer} />
    </div>
  );
}
