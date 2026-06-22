import {
  Layout,
  Type,
  Grid3X3,
  Workflow,
  ShieldCheck,
  CircleHelp,
  MousePointerClick,
  Zap,
  PanelTop,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getLandingPageContent,
} from "@/actions/landing-page";
import { HeroForm } from "@/components/landing-page/hero-form";
import { CapabilitiesForm } from "@/components/landing-page/capabilities-form";
import { ProofForm } from "@/components/landing-page/proof-form";
import { FAQForm } from "@/components/landing-page/faq-form";
import { ContactCtaForm } from "@/components/landing-page/contact-cta-form";
import { FooterForm } from "@/components/landing-page/footer-form";
import { ResetButton } from "@/components/landing-page/reset-button";
import { SupportPathsForm } from "@/components/landing-page/support-paths-form";
import { HeaderForm } from "@/components/landing-page/header-form";
import { WorkflowStepsForm } from "@/components/landing-page/workflow-steps-form";
import { DEFAULT_LANDING_CONTENT } from "@/types/landing-page";

// Force dynamic rendering for authenticated routes
export const dynamic = "force-dynamic";

export default async function LandingPageAdmin() {
  const contentResult = await getLandingPageContent();

  if (!contentResult.success || !contentResult.data) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Content</CardTitle>
            <CardDescription>
              {contentResult.error || "Failed to load landing page content"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const content = contentResult.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Landing Page</h1>
          <p className="text-muted-foreground mt-2">
            Manage your public landing page content
          </p>
        </div>
        <ResetButton />
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="header" className="space-y-4">
        <TabsList className="inline-flex h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-muted/50 p-1.5 lg:w-auto">
          <TabsTrigger
            value="header"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <PanelTop className="h-4 w-4 text-indigo-500" />
            <span className="hidden sm:inline">Header</span>
          </TabsTrigger>
          <TabsTrigger
            value="hero"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Type className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Hero</span>
          </TabsTrigger>
          <TabsTrigger
            value="support-paths"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="hidden sm:inline">Support Paths</span>
          </TabsTrigger>
          <TabsTrigger
            value="workflow"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Workflow className="h-4 w-4 text-blue-500" />
            <span className="hidden sm:inline">Workflow</span>
          </TabsTrigger>
          <TabsTrigger
            value="features"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Grid3X3 className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger
            value="proof"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ShieldCheck className="h-4 w-4 text-purple-500" />
            <span className="hidden sm:inline">Proof</span>
          </TabsTrigger>
          <TabsTrigger
            value="faq"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <CircleHelp className="h-4 w-4 text-orange-500" />
            <span className="hidden sm:inline">FAQ</span>
          </TabsTrigger>
          <TabsTrigger
            value="contact"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <MousePointerClick className="h-4 w-4 text-green-500" />
            <span className="hidden sm:inline">Contact</span>
          </TabsTrigger>
          <TabsTrigger
            value="footer"
            className="gap-2 rounded-lg px-4 py-2.5 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <Layout className="h-4 w-4 text-cyan-500" />
            <span className="hidden sm:inline">Footer</span>
          </TabsTrigger>
        </TabsList>

        {/* Header Section */}
        <TabsContent value="header">
          <Suspense fallback={<FormSkeleton />}>
            <HeaderForm
              header={content.header ?? DEFAULT_LANDING_CONTENT.header}
            />
          </Suspense>
        </TabsContent>

        {/* Hero Section */}
        <TabsContent value="hero">
          <Suspense fallback={<FormSkeleton />}>
            <HeroForm hero={content.hero} />
          </Suspense>
        </TabsContent>

        {/* Quick Services Section */}
        <TabsContent value="support-paths">
          <Suspense fallback={<FormSkeleton />}>
            <SupportPathsForm supportPaths={content.supportPaths || []} />
          </Suspense>
        </TabsContent>

        {/* Workflow Section */}
        <TabsContent value="workflow">
          <Suspense fallback={<FormSkeleton />}>
            <WorkflowStepsForm workflowSteps={content.workflowSteps || []} />
          </Suspense>
        </TabsContent>

        {/* Features */}
        <TabsContent value="features">
          <Suspense fallback={<FormSkeleton />}>
            <CapabilitiesForm capabilities={content.capabilities || []} />
          </Suspense>
        </TabsContent>

        {/* Proof */}
        <TabsContent value="proof">
          <Suspense fallback={<FormSkeleton />}>
            <ProofForm proof={content.proof} />
          </Suspense>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq">
          <Suspense fallback={<FormSkeleton />}>
            <FAQForm faq={content.faq || []} />
          </Suspense>
        </TabsContent>

        {/* Contact CTA */}
        <TabsContent value="contact">
          <Suspense fallback={<FormSkeleton />}>
            <ContactCtaForm contactCta={content.contactCta} />
          </Suspense>
        </TabsContent>

        {/* Footer */}
        <TabsContent value="footer">
          <Suspense fallback={<FormSkeleton />}>
            <FooterForm footer={content.footer} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-96 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
