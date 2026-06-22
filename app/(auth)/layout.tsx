import { PublicHeader } from "@/components/layout/public-header";
import { PublicFooter } from "@/components/layout/public-footer";
import { getPublicLandingContent } from "@/actions/landing-page";
import { LandingPageContent } from "@/types/landing-page";

// Disable static generation for auth pages
export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await getPublicLandingContent();
  const content = result.data as LandingPageContent;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicHeader variant="auth" header={content?.header} />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      <PublicFooter content={content?.footer} />
    </div>
  );
}
