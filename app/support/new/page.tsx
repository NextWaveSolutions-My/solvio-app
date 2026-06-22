import type { Metadata } from "next";
import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicTicketForm } from "@/components/tickets/public-ticket-form";
import { getPublicLandingContent } from "@/actions/landing-page";
import { getAppMetadata } from "@/lib/settings-utils";
import type { LandingPageContent } from "@/types/landing-page";

export async function generateMetadata(): Promise<Metadata> {
  const app = await getAppMetadata();
  const appName =
    typeof app.title === "string" ? app.title : "Support";
  return {
    title: `Create a Ticket | ${appName}`,
    description:
      "Submit a support ticket — no account required. Describe your issue and our team will follow up by email.",
  };
}

export default async function PublicNewTicketPage() {
  const result = await getPublicLandingContent();
  const content = result.data as LandingPageContent;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader variant="landing" header={content?.header} />
      <main className="relative isolate flex-1">
        {/* Decorative background — soft tonal base + a primary glow up top so
            the white cards have something to sit against (matches the landing
            page's accent treatment). */}
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/50 via-background to-background"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-primary/[0.07] to-transparent"
        />
        <PublicTicketForm />
      </main>
      <PublicFooter content={content?.footer} />
    </div>
  );
}
