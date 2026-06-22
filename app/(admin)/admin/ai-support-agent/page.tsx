import {
  Plus,
  Sparkles,
  CheckCircle2,
  Database,
  Activity,
  MessagesSquare,
  FlaskConical,
  ScrollText,
  Settings2,
  Code2,
  Palette,
  Workflow,
  Globe,
  FolderUp,
  Gauge,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatsGrid } from "@/components/shared/stats-grid";
import { PairsTable } from "@/components/ai-training/pairs-table";
import { TestAIPanel } from "@/components/ai-training/test-ai-panel";
import { ChatLogsPanel } from "@/components/ai-training/chat-logs-panel";
import { AISettingsForm } from "@/components/ai-training/ai-settings-form";
import { getAISettings, listAITrainingPairs } from "@/actions/ai-training";
import { listWebSources } from "@/actions/ai-web-sources";
import { WebSourcesPanel } from "@/components/ai-training/web-sources-panel";
import { listFiles } from "@/actions/ai-files";
import { FilesPanel } from "@/components/ai-training/files-panel";
import { listSites } from "@/actions/ai-sites";
import { SitesPanel } from "@/components/ai-training/sites-panel";
import { listEvalCases, getLatestEvalRun } from "@/actions/ai-eval";
import { EvaluationPanel } from "@/components/ai-training/evaluation-panel";
import { RegenerateButton } from "@/components/ai-training/regenerate-button";
import { HowItWorksPanel } from "@/components/ai-training/how-it-works-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImportPairsDialog } from "@/components/ai-training/import-pairs-dialog";
import { WidgetSettingsForm } from "@/components/ai-training/widget-settings-form";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    limit?: string;
    search?: string;
    category?: string;
  }>;
}

export default async function AITrainingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = params.tab ?? "pairs";
  const page = parseInt(params.page ?? "1", 10) || 1;
  const limit = parseInt(params.limit ?? "10", 10) || 10;
  const search = params.search ?? "";
  const category = params.category ?? "";

  const [
    pairsResult,
    settingsResult,
    webSourcesResult,
    filesResult,
    evalCasesResult,
    evalRunResult,
    sitesResult,
  ] = await Promise.all([
    listAITrainingPairs({ page, search, category, limit }),
    getAISettings(),
    listWebSources(),
    listFiles(),
    listEvalCases(),
    getLatestEvalRun(),
    listSites(),
  ]);

  const pairsData = pairsResult.data;
  const settings = settingsResult.data;
  const webSources = webSourcesResult.data ?? [];
  const files = filesResult.data ?? [];
  const sites = sitesResult.data ?? [];
  const evalCases = evalCasesResult.data ?? [];
  const latestEvalRun = evalRunResult.data ?? null;

  const totalPairs = pairsData?.total ?? 0;
  const activePairs = pairsData?.activeCount ?? 0;
  const readyPairs = pairsData?.readyCount ?? 0;

  const stats = [
    {
      title: "Total Pairs",
      value: totalPairs,
      icon: Database,
      iconColor: "text-info",
      iconBgColor: "bg-info/15",
      description: "Across all categories",
    },
    {
      title: "Ready",
      value: readyPairs,
      icon: CheckCircle2,
      iconColor: "text-success",
      iconBgColor: "bg-success/15",
      description: "Embeddings generated",
    },
    {
      title: "Active",
      value: activePairs,
      icon: Activity,
      iconColor: "text-primary",
      iconBgColor: "bg-primary/15",
      description: "Available for matching",
    },
  ];

  return (
    <div className="pb-8">
      <Tabs defaultValue={tab} className="space-y-6">
        {/* Sticky page header: title + tabs stay pinned while scrolling */}
        <div className="sticky top-14 z-30 -mx-4 -mt-4 border-b border-border bg-background/95 px-4 pt-4 backdrop-blur md:-mx-6 md:-mt-6 md:px-6 md:pt-6 supports-backdrop-filter:bg-background/80">
          <div className="flex flex-col gap-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                  AI Support Agent
                </h1>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Train your chatbot with approved Q&amp;A pairs, review
                conversations, and tune behavior.
              </p>
            </div>
            <div className="flex gap-2">
              <RegenerateButton />
              <ImportPairsDialog />
              <Button asChild size="sm">
                <Link href="/admin/ai-support-agent/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  New Pair
                </Link>
              </Button>
            </div>
          </div>

          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="how-it-works"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <Workflow className="h-4 w-4" />
              How it Works
            </TabsTrigger>
            <TabsTrigger
              value="pairs"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <MessagesSquare className="h-4 w-4" />
              Q&amp;A Pairs
            </TabsTrigger>
            <TabsTrigger
              value="web-sources"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <Globe className="h-4 w-4" />
              Web Sources
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <FolderUp className="h-4 w-4" />
              Files
            </TabsTrigger>
            <TabsTrigger
              value="evaluation"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <Gauge className="h-4 w-4" />
              Evaluation
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <ScrollText className="h-4 w-4" />
              Chat Logs
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <Settings2 className="h-4 w-4" />
              Settings
            </TabsTrigger>
            <TabsTrigger
              value="widget"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <Palette className="h-4 w-4" />
              Widget
            </TabsTrigger>
            <TabsTrigger
              value="embed"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <Code2 className="h-4 w-4" />
              Install (Embed)
            </TabsTrigger>
            <TabsTrigger
              value="test"
              className="group relative -mb-px flex-none gap-2 rounded-lg rounded-b-none border-0 border-b-2 border-transparent bg-transparent px-3.5 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-muted/50 hover:text-foreground data-[state=active]:border-b-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none [&_svg]:transition-colors [&_svg]:text-muted-foreground/70 group-hover:[&_svg]:text-foreground data-[state=active]:[&_svg]:text-primary"
            >
              <FlaskConical className="h-4 w-4" />
              Test AI
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="how-it-works">
          {settings ? (
            <HowItWorksPanel
              maxIterations={settings.agent.maxIterations}
              rateLimitPerMinute={settings.chatbot.rateLimitPerMinute}
              ticketRateLimitPerHour={settings.chatbot.ticketRateLimitPerHour}
              indexResolvedTickets={settings.agent.indexResolvedTickets}
              confidenceThreshold={settings.confidenceThreshold}
              agentEnabled={settings.agent.enabled}
              chatbotEnabled={settings.features.chatbot}
            />
          ) : (
            <p className="text-sm text-destructive">
              {settingsResult.error ?? "Failed to load settings"}
            </p>
          )}
        </TabsContent>

        <TabsContent value="pairs" className="space-y-6">
          <StatsGrid stats={stats} />
          {pairsResult.success && pairsData ? (
            <PairsTable
              pairs={pairsData.pairs}
              categories={pairsData.categories}
              total={pairsData.total}
              page={pairsData.page}
              pages={pairsData.pages}
              pageSize={pairsData.limit}
              initialSearch={search}
              initialCategory={category}
            />
          ) : (
            <p className="text-sm text-destructive">
              {pairsResult.error ?? "Failed to load pairs"}
            </p>
          )}
        </TabsContent>

        <TabsContent value="web-sources">
          <WebSourcesPanel initialSources={webSources} sites={sites} />
        </TabsContent>

        <TabsContent value="files">
          <FilesPanel initialFiles={files} sites={sites} />
        </TabsContent>


        <TabsContent value="evaluation">
          <EvaluationPanel
            initialCases={evalCases}
            initialLatestRun={latestEvalRun}
            sites={sites}
          />
        </TabsContent>

        <TabsContent value="logs">
          <ChatLogsPanel />
        </TabsContent>

        <TabsContent value="settings">
          {settingsResult.success && settings ? (
            <AISettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-destructive">
              {settingsResult.error ?? "Failed to load settings"}
            </p>
          )}
        </TabsContent>

        <TabsContent value="widget">
          {settingsResult.success && settings ? (
            <WidgetSettingsForm settings={settings} />
          ) : (
            <p className="text-sm text-destructive">
              {settingsResult.error ?? "Failed to load settings"}
            </p>
          )}
        </TabsContent>

        <TabsContent value="embed">
          <SitesPanel
            initialSites={sites}
            appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""}
            widgetWidth={settings?.chatbot.widgetWidth}
            widgetHeight={settings?.chatbot.widgetHeight}
          />
        </TabsContent>

        <TabsContent value="test">
          <TestAIPanel
            widgetWidth={settings?.chatbot.widgetWidth}
            widgetHeight={settings?.chatbot.widgetHeight}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
