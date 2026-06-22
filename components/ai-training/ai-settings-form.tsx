"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  KeyRound,
  PlugZap,
  MessageCircle,
  Sparkles,
  RefreshCcw,
  Server,
  Search,
  SlidersHorizontal,
  Building2,
  LayoutGrid,
  Cloud,
  HardDrive,
  ExternalLink,
  AlertTriangle,
  DatabaseZap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updateAISettings,
  testAISettingsConnection,
  testAIChatConnection,
  reindexKnowledgeBase,
  syncQdrant,
  getRetrievalHealth,
} from "@/actions/ai-training";
import type { AISettingsPublic, RetrievalIndexHealth } from "@/types";

const schema = z.object({
  apiKey: z.string().optional(),
  ollamaApiKey: z.string().optional(),
  chatProvider: z.enum(["openai", "ollama"]),
  embeddingProvider: z.enum(["openai", "ollama"]),
  ollamaBaseUrl: z.string().max(300),
  ollamaChatModel: z.string().max(100),
  ollamaEmbeddingModel: z.string().max(100),
  chatModel: z.string().min(1).max(100),
  embeddingModel: z.string().min(1).max(100),
  confidenceThreshold: z.number().min(0.5).max(0.95),
  maxTokens: z.number().int().min(50).max(4000),
  temperature: z.number().min(0).max(1),
  businessName: z.string().max(200),
  businessDescription: z.string().max(2000),
  systemPrompt: z.string().max(4000),
  vectorSearchMethod: z.enum(["local", "qdrant"]),
  searchMode: z.enum(["vector", "hybrid"]),
  rerankEnabled: z.boolean(),
  agent: z.object({
    enabled: z.boolean(),
    maxIterations: z.number().int().min(1).max(8),
    indexResolvedTickets: z.boolean(),
  }),
  features: z.object({
    chatbot: z.boolean(),
    agentSuggest: z.boolean(),
    ticketClassify: z.boolean(),
  }),
  // Appearance fields (position, colors, powered-by) live on the Widget tab.
  chatbot: z.object({
    welcomeMessage: z.string().max(500),
    fallbackMessage: z.string().max(500),
    placeholder: z.string().max(100),
    rateLimitPerMinute: z.number().int().min(1).max(200),
    ticketRateLimitPerHour: z.number().int().min(1).max(50),
  }),
});

type FormData = z.infer<typeof schema>;

type Provider = "openai" | "ollama";

const PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI", icon: Sparkles },
  { value: "ollama", label: "Ollama", icon: Server },
] as const;

type OllamaMode = "cloud" | "local";

const OLLAMA_CLOUD_URL = "https://ollama.com/v1";
const OLLAMA_LOCAL_URL = "http://localhost:11434/v1";

const OLLAMA_MODE_OPTIONS = [
  {
    value: "cloud",
    label: "Ollama Cloud",
    icon: Cloud,
    desc: "Hosted by Ollama · API key required",
  },
  {
    value: "local",
    label: "Local / Self-hosted",
    icon: HardDrive,
    desc: "Runs on your machine · no key needed",
  },
] as const;

/**
 * Cloud vs Local is purely a function of the base URL — an ollama.com endpoint
 * is the managed cloud, anything else is a machine the operator runs. An unset
 * URL defaults to cloud, the recommended starting point.
 */
function ollamaModeFromUrl(url: string | undefined): OllamaMode {
  const u = url?.trim() ?? "";
  return !u || u.includes("ollama.com") ? "cloud" : "local";
}

const SECTIONS = [
  { id: "providers", label: "Providers" },
  { id: "tuning", label: "Response Tuning" },
  { id: "business", label: "Business Context" },
  { id: "agent", label: "Autonomous Agent" },
  { id: "search", label: "Search & Features" },
  { id: "widget", label: "Messages & Limits" },
] as const;

const SECTION_IDS = SECTIONS.map((s) => s.id);

/** Highlights whichever section is currently nearest the top of the viewport. */
function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

/** Sticky in-page jump nav for the settings sections. */
function SectionNav() {
  const active = useActiveSection(SECTION_IDS);
  return (
    <nav className="sticky top-52 hidden w-44 shrink-0 lg:block">
      <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-0.5">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById(s.id)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className={cn(
                "w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                active === s.id
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Segmented two-option selector for picking a provider. */
function ProviderToggle({
  value,
  onChange,
}: {
  value: Provider;
  onChange: (value: Provider) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup">
      {PROVIDER_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Two-option selector distinguishing hosted Ollama Cloud from a local server. */
function OllamaModeToggle({
  value,
  onChange,
}: {
  value: OllamaMode;
  onChange: (value: OllamaMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup">
      {OLLAMA_MODE_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-all",
              "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              active
                ? "border-primary bg-primary/10 text-primary shadow-xs"
                : "border-border bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground"
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4" />
              {opt.label}
            </span>
            <span className="text-xs font-normal text-muted-foreground">
              {opt.desc}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AISettingsForm({
  settings,
}: {
  settings: AISettingsPublic;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingChat, setIsTestingChat] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isSyncingQdrant, setIsSyncingQdrant] = useState(false);
  const [health, setHealth] = useState<RetrievalIndexHealth | null>(null);
  // Start split only if the saved config already mixes providers.
  const [splitProviders, setSplitProviders] = useState(
    settings.chatProvider !== settings.embeddingProvider
  );

  // Load index size/backend once so we can recommend Qdrant when local cosine
  // is being pushed past the point it scales.
  useEffect(() => {
    let cancelled = false;
    void getRetrievalHealth().then((res) => {
      if (!cancelled && res.success && res.data) setHealth(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      apiKey: settings.hasApiKey ? settings.apiKeyPreview : "",
      ollamaApiKey: settings.hasOllamaApiKey ? "***saved***" : "",
      chatProvider: settings.chatProvider,
      embeddingProvider: settings.embeddingProvider,
      ollamaBaseUrl: settings.ollamaBaseUrl,
      ollamaChatModel: settings.ollamaChatModel,
      ollamaEmbeddingModel: settings.ollamaEmbeddingModel,
      chatModel: settings.chatModel,
      embeddingModel: settings.embeddingModel,
      confidenceThreshold: settings.confidenceThreshold,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
      businessName: settings.businessName,
      businessDescription: settings.businessDescription,
      systemPrompt: settings.systemPrompt,
      vectorSearchMethod: settings.vectorSearchMethod,
      searchMode: settings.searchMode,
      rerankEnabled: settings.rerankEnabled,
      agent: settings.agent,
      features: settings.features,
      chatbot: settings.chatbot,
    },
  });

  const threshold = watch("confidenceThreshold");
  const features = watch("features");
  const chatProvider = watch("chatProvider");
  const embeddingProvider = watch("embeddingProvider");
  const usesOpenAI = chatProvider === "openai" || embeddingProvider === "openai";
  const usesOllama = chatProvider === "ollama" || embeddingProvider === "ollama";
  const agent = watch("agent");

  const ollamaBaseUrl = watch("ollamaBaseUrl");
  const ollamaMode = ollamaModeFromUrl(ollamaBaseUrl);

  // Switching mode just repoints the base URL: Cloud → the hosted endpoint,
  // Local → localhost. A custom self-hosted URL is treated as Local.
  const setOllamaMode = (mode: OllamaMode) =>
    setValue(
      "ollamaBaseUrl",
      mode === "cloud" ? OLLAMA_CLOUD_URL : OLLAMA_LOCAL_URL,
      { shouldDirty: true }
    );

  // When Ollama is first selected, default to Cloud unless the operator has
  // already pointed the base URL at their own server.
  const defaultToCloudIfUnset = () => {
    const url = watch("ollamaBaseUrl");
    if (!url || url === OLLAMA_LOCAL_URL) {
      setValue("ollamaBaseUrl", OLLAMA_CLOUD_URL, { shouldDirty: true });
    }
  };

  // Ollama Cloud serves no embedding models, and chat + embedding Ollama
  // clients share one base URL — so the only working partner for cloud chat is
  // OpenAI. This splits providers and moves embeddings there in one click.
  const useOpenAIForEmbeddings = () => {
    setSplitProviders(true);
    setValue("embeddingProvider", "openai", { shouldDirty: true });
  };

  // Unified mode sets both chat and embedding to the same provider.
  const setUnifiedProvider = (value: Provider) => {
    const wasOllama = usesOllama;
    setValue("chatProvider", value, { shouldDirty: true });
    setValue("embeddingProvider", value, { shouldDirty: true });
    if (value === "ollama" && !wasOllama) defaultToCloudIfUnset();
  };

  const toggleSplitProviders = (split: boolean) => {
    setSplitProviders(split);
    // Collapsing back to unified: embeddings follow the chat provider.
    if (!split)
      setValue("embeddingProvider", chatProvider, { shouldDirty: true });
  };
  const vectorMethod = watch("vectorSearchMethod");
  const searchMode = watch("searchMode");
  const rerankEnabled = watch("rerankEnabled");

  const onSubmit = async (data: FormData) => {
    setIsSaving(true);
    try {
      const payload = { ...data };
      if (payload.apiKey?.startsWith("sk-...")) {
        delete payload.apiKey;
      }
      if (payload.ollamaApiKey?.startsWith("***")) {
        delete payload.ollamaApiKey;
      }
      const result = await updateAISettings(payload);
      if (result.success) {
        if (result.data?.reindexRequired) {
          toast.warning(
            "Embedding model changed — click Reindex to rebuild the index."
          );
        } else {
          toast.success("AI settings saved");
        }
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const onInvalid = () => {
    toast.error("Please fix the highlighted fields before saving.");
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      const result = await reindexKnowledgeBase();
      if (result.success && result.data) {
        const { kb, services, resolvedTickets, web, files, failed } =
          result.data;
        toast.success(
          `Reindexed: ${kb} KB · ${services} services · ` +
            `${resolvedTickets} resolved tickets · ${web} web pages · ` +
            `${files} file chunks${failed ? ` · ${failed} failed` : ""}`
        );
      } else {
        toast.error(result.error ?? "Reindex failed");
      }
    } finally {
      setIsReindexing(false);
    }
  };

  const handleSyncQdrant = async () => {
    setIsSyncingQdrant(true);
    try {
      const result = await syncQdrant();
      if (result.success && result.data) {
        toast.success(`Synced ${result.data.synced} vectors to Qdrant`);
      } else {
        toast.error(result.error ?? "Qdrant sync failed");
      }
    } finally {
      setIsSyncingQdrant(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const result = await testAISettingsConnection();
      if (result.success) {
        toast.success("Embedding provider OK");
      } else {
        toast.error(result.error ?? "Connection failed");
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestChat = async () => {
    setIsTestingChat(true);
    try {
      const result = await testAIChatConnection();
      if (result.success) {
        toast.success("Chat provider OK");
      } else {
        toast.error(result.error ?? "Connection failed");
      }
    } finally {
      setIsTestingChat(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <SectionNav />
        <div className="min-w-0 flex-1 space-y-6">
      {/* Providers */}
      <Card id="providers" className="scroll-mt-52">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlugZap className="h-4 w-4" />
            Providers
          </CardTitle>
          <CardDescription>
            Pick where chat and embeddings run — OpenAI or a local Ollama
            server. Ollama uses its OpenAI-compatible /v1 endpoint. Credentials
            and model names for the selected providers appear below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settings.reindexRequired && (
            <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 sm:flex-row sm:items-center sm:justify-between dark:text-amber-400">
              <span>
                Embedding model/provider changed. The knowledge index is stale
                — rebuild it to apply the change.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReindex}
                disabled={isReindexing}
                className="shrink-0 border-amber-500/40 bg-background"
              >
                {isReindexing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5">Reindex now</span>
              </Button>
            </div>
          )}
          {/* Provider selection */}
          <div className="space-y-4">
            {splitProviders ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-sm font-medium">Chat Provider</Label>
                  </div>
                  <ProviderToggle
                    value={chatProvider}
                    onChange={(v) => {
                      const wasOllama = usesOllama;
                      setValue("chatProvider", v, { shouldDirty: true });
                      if (v === "ollama" && !wasOllama) defaultToCloudIfUnset();
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generates chatbot and agent replies.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-sm font-medium">
                      Embedding Provider
                    </Label>
                  </div>
                  <ProviderToggle
                    value={embeddingProvider}
                    onChange={(v) => {
                      const wasOllama = usesOllama;
                      setValue("embeddingProvider", v, { shouldDirty: true });
                      if (v === "ollama" && !wasOllama) defaultToCloudIfUnset();
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Powers knowledge-base search and matching.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <PlugZap className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-sm font-medium">Provider</Label>
                </div>
                <ProviderToggle
                  value={chatProvider}
                  onChange={setUnifiedProvider}
                />
                <p className="text-xs text-muted-foreground">
                  Used for both chat replies and knowledge-base search.
                </p>
              </div>
            )}

            {/* Advanced: configure chat and embeddings separately */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">
                  Use different providers for chat and embeddings
                </p>
                <p className="text-xs text-muted-foreground">
                  Advanced — e.g. OpenAI for chat, local Ollama for embeddings.
                </p>
              </div>
              <Switch
                checked={splitProviders}
                onCheckedChange={toggleSplitProviders}
              />
            </div>
          </div>

          {/* OpenAI config — only when OpenAI is selected */}
          {usesOpenAI && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">OpenAI</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  className="h-9 font-mono text-xs"
                  autoComplete="new-password"
                  data-1p-ignore
                  data-lpignore="true"
                  {...register("apiKey")}
                />
                <p className="text-xs text-muted-foreground">
                  {settings.hasApiKey
                    ? "Stored encrypted. Leave unchanged to keep the existing key."
                    : "No key saved yet. Paste your OpenAI secret key, then save."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {chatProvider === "openai" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Chat Model</Label>
                    <Input
                      className="h-9 font-mono text-xs"
                      placeholder="gpt-4o-mini"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      {...register("chatModel")}
                    />
                  </div>
                )}
                {embeddingProvider === "openai" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Embedding Model
                    </Label>
                    <Input
                      className="h-9 font-mono text-xs"
                      placeholder="text-embedding-3-small"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      {...register("embeddingModel")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ollama config — only when Ollama is selected */}
          {usesOllama && (
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Ollama</p>
              </div>

              {/* Cloud vs Local — the key choice, made explicit */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  How are you running Ollama?
                </Label>
                <OllamaModeToggle value={ollamaMode} onChange={setOllamaMode} />
                {ollamaMode === "cloud" ? (
                  <p className="text-xs text-muted-foreground">
                    Models run on Ollama&apos;s servers — nothing to install.
                    Create a key under your Ollama account&apos;s{" "}
                    <a
                      href="https://ollama.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                    >
                      Keys
                      <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    page, then use a cloud model such as{" "}
                    <code className="text-[11px]">gpt-oss:20b-cloud</code>.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ollama runs on your own machine or server. Install it, run{" "}
                    <code className="text-[11px]">ollama pull llama3.1</code>,
                    and no API key is needed. The app server must be able to
                    reach this URL.
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Base URL: fixed/managed for Cloud, editable for Local */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm font-medium">Base URL</Label>
                  <Input
                    className={cn(
                      "h-9 font-mono text-xs",
                      ollamaMode === "cloud" &&
                        "cursor-not-allowed bg-muted text-muted-foreground"
                    )}
                    placeholder={
                      ollamaMode === "cloud" ? OLLAMA_CLOUD_URL : OLLAMA_LOCAL_URL
                    }
                    readOnly={ollamaMode === "cloud"}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    {...register("ollamaBaseUrl")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {ollamaMode === "cloud"
                      ? "Managed Ollama Cloud endpoint — set automatically."
                      : "e.g. http://localhost:11434/v1, or your self-hosted server URL."}
                  </p>
                </div>
                {chatProvider === "ollama" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Chat Model</Label>
                    <Input
                      className="h-9 font-mono text-xs"
                      placeholder={
                        ollamaMode === "cloud" ? "gpt-oss:20b-cloud" : "llama3.1"
                      }
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      {...register("ollamaChatModel")}
                    />
                  </div>
                )}
                {embeddingProvider === "ollama" && ollamaMode === "local" && (
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Embedding Model
                    </Label>
                    <Input
                      className="h-9 font-mono text-xs"
                      placeholder="nomic-embed-text"
                      autoComplete="off"
                      data-1p-ignore
                      data-lpignore="true"
                      {...register("ollamaEmbeddingModel")}
                    />
                  </div>
                )}
                {embeddingProvider === "ollama" && ollamaMode === "cloud" && (
                  <div className="space-y-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 sm:col-span-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                          Ollama Cloud can&apos;t generate embeddings
                        </p>
                        <p className="text-xs text-amber-700/90 dark:text-amber-400/90">
                          Cloud hosts chat models only, so knowledge-base search
                          can&apos;t run here. Keep chat on Ollama Cloud and
                          generate embeddings with OpenAI instead.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={useOpenAIForEmbeddings}
                      className="border-amber-500/40 bg-background"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span className="ml-1.5">Use OpenAI for embeddings</span>
                    </Button>
                  </div>
                )}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-sm font-medium">
                    {ollamaMode === "cloud" ? "API Key" : "API Key (optional)"}
                  </Label>
                  <Input
                    type="password"
                    className="h-9 font-mono text-xs"
                    placeholder={
                      ollamaMode === "cloud"
                        ? "Paste your Ollama Cloud API key"
                        : "leave blank for local Ollama"
                    }
                    autoComplete="new-password"
                    data-1p-ignore
                    data-lpignore="true"
                    {...register("ollamaApiKey")}
                  />
                  {ollamaMode === "cloud" && (
                    <p className="text-xs text-muted-foreground">
                      {settings.hasOllamaApiKey
                        ? "Stored encrypted. Leave unchanged to keep the existing key."
                        : "Required for Ollama Cloud."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Connection tests */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <span className="text-xs font-medium text-muted-foreground">
              Test connection:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestChat}
              disabled={
                isTestingChat ||
                (chatProvider === "openai" && !settings.hasApiKey)
              }
            >
              {isTestingChat ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MessageCircle className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Chat</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={
                isTesting ||
                (embeddingProvider === "openai" && !settings.hasApiKey)
              }
            >
              {isTesting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Embeddings</span>
            </Button>
          </div>

          {/* Knowledge index — lives with the embedding settings that invalidate it */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Knowledge Index</p>
              <p className="text-xs text-muted-foreground">
                Rebuild embeddings from Q&amp;A, KB articles, services and
                resolved tickets. Run after changing the embedding model.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReindex}
              disabled={isReindexing}
            >
              {isReindexing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              <span className="ml-1.5">Reindex</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Response tuning */}
      <Card id="tuning" className="scroll-mt-52">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="h-4 w-4" />
            Response Tuning
          </CardTitle>
          <CardDescription>
            How the assistant generates and matches answers. Applies to
            whichever provider is active above.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Confidence Threshold
              </Label>
              <span className="text-xs font-medium text-primary">
                {Math.round(threshold * 100)}%
              </span>
            </div>
            <Input
              type="range"
              min={0.5}
              max={0.95}
              step={0.01}
              className="accent-primary"
              {...register("confidenceThreshold", { valueAsNumber: true })}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>50%</span>
              <span>95%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum similarity for the lookup_faq tool to treat a match as
              confident.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Max Tokens</Label>
            <Input
              type="number"
              className="h-9"
              {...register("maxTokens", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Upper bound on the length of each generated reply.
            </p>
            {errors.maxTokens && (
              <p className="text-xs text-destructive">
                {errors.maxTokens.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Temperature</Label>
            <Input
              type="number"
              step={0.05}
              className="h-9"
              {...register("temperature", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Lower is more focused and deterministic; higher is more creative.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business context */}
      <Card id="business" className="scroll-mt-52">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" />
            Business Context
          </CardTitle>
          <CardDescription>
            Used as grounding when the AI generates responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Business Name</Label>
            <Input
              className="h-9"
              placeholder="Acme Inc."
              {...register("businessName")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Business Description</Label>
            <Textarea
              rows={3}
              className="resize-none text-sm"
              placeholder="A short description of what your business does..."
              {...register("businessDescription")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">System Prompt</Label>
            <Textarea
              rows={5}
              className="resize-none text-sm font-mono"
              {...register("systemPrompt")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Agent */}
      <Card id="agent" className="scroll-mt-52">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            Autonomous Agent
          </CardTitle>
          <CardDescription>
            The agent reasons over Q&amp;A, documentation and resolved tickets,
            and can auto-create + auto-assign an escalation ticket.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Agent enabled</p>
              <p className="text-xs text-muted-foreground">
                When off, the chatbot is disabled entirely.
              </p>
            </div>
            <Switch
              checked={agent.enabled}
              onCheckedChange={(v) =>
                setValue("agent.enabled", v, { shouldDirty: true })
              }
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Max tool iterations</Label>
              <span className="text-xs font-medium text-primary">
                {agent.maxIterations}
              </span>
            </div>
            <Input
              type="range"
              min={1}
              max={8}
              step={1}
              className="accent-primary"
              {...register("agent.maxIterations", { valueAsNumber: true })}
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>1</span>
              <span>8</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Max reasoning/tool steps before the agent must answer or
              escalate.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Index resolved tickets</p>
              <p className="text-xs text-muted-foreground">
                Make resolved ticket threads (public comments only) searchable.
                Contains customer content — disable if not desired.
              </p>
            </div>
            <Switch
              checked={agent.indexResolvedTickets}
              onCheckedChange={(v) =>
                setValue("agent.indexResolvedTickets", v, { shouldDirty: true })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Vector search + features */}
      <Card id="search" className="scroll-mt-52">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutGrid className="h-4 w-4" />
            Search &amp; Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Vector Search Method</Label>
            <Select
              value={vectorMethod}
              onValueChange={(v) =>
                setValue(
                  "vectorSearchMethod",
                  v as FormData["vectorSearchMethod"],
                  { shouldDirty: true }
                )
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">Local cosine (default)</SelectItem>
                <SelectItem value="qdrant">Qdrant (recommended)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              <strong>Local</strong> scans all vectors in memory — fine for
              small sets. <strong>Qdrant</strong> offloads vector search to a
              self-hosted Qdrant for scale; set <code className="text-[11px]">QDRANT_URL</code>{" "}
              in your environment, then click <em>Sync to Qdrant</em> below to
              backfill. If Qdrant is unreachable, search falls back to Local.
            </p>
            {health?.recommendQdrant && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
                Your knowledge index has{" "}
                <strong>{health.vectorCount.toLocaleString()}</strong> vectors —
                past the ~{health.warnThreshold.toLocaleString()} where local
                cosine (which loads every vector into memory on each query) gets
                slow and RAM-hungry. Move to <strong>Qdrant</strong>: set{" "}
                <code className="text-[11px]">QDRANT_URL</code>, switch the method
                above, then <em>Sync to Qdrant</em>.
              </div>
            )}
            {vectorMethod === "qdrant" && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSyncQdrant}
                  disabled={isSyncingQdrant}
                >
                  {isSyncingQdrant ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <DatabaseZap className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Sync to Qdrant
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Retrieval Mode</Label>
            <Select
              value={searchMode}
              onValueChange={(v) =>
                setValue("searchMode", v as FormData["searchMode"], {
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hybrid">
                  Hybrid (semantic + keyword)
                </SelectItem>
                <SelectItem value="vector">Vector only (semantic)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Hybrid fuses vector similarity with keyword matching (Reciprocal
              Rank Fusion) — better at exact terms like error codes and product
              names. Recommended.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <div>
              <p className="text-sm font-medium">Re-rank results</p>
              <p className="text-xs text-muted-foreground">
                Reorder top candidates with the chat model for higher precision.
                Adds a small latency/cost per query.
              </p>
            </div>
            <Switch
              checked={rerankEnabled}
              onCheckedChange={(v) =>
                setValue("rerankEnabled", v, { shouldDirty: true })
              }
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Feature Toggles
            </p>
            {(
              [
                {
                  key: "chatbot",
                  label: "Customer Chatbot",
                  desc: "Auto-reply to customers with matched answers",
                },
                {
                  key: "agentSuggest",
                  label: "Agent Suggestions",
                  desc: "Suggest replies to support agents",
                },
                {
                  key: "ticketClassify",
                  label: "Ticket Classification",
                  desc: "Auto-tag tickets by topic",
                },
              ] as const
            ).map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={features[item.key]}
                  onCheckedChange={(v) =>
                    setValue(`features.${item.key}`, v, { shouldDirty: true })
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chatbot messages & limits */}
      <Card id="widget" className="scroll-mt-52">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="h-4 w-4" />
            Messages &amp; Limits
          </CardTitle>
          <CardDescription>
            What the chat widget says and how often visitors can use it. For
            appearance — colors, position, header and avatar — see the{" "}
            <strong>Widget</strong> tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Welcome Message</Label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              placeholder="Hi! How can I help you today?"
              {...register("chatbot.welcomeMessage")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Fallback Message</Label>
            <Textarea
              rows={2}
              className="resize-none text-sm"
              placeholder="I couldn't find an answer. Would you like to contact support?"
              {...register("chatbot.fallbackMessage")}
            />
            <p className="text-xs text-muted-foreground">
              Shown when no matching answer is found. The ticket form appears
              right after.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm font-medium">Input Placeholder</Label>
              <Input
                className="h-9"
                placeholder="Ask a question..."
                {...register("chatbot.placeholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Rate Limit / minute
              </Label>
              <Input
                type="number"
                className="h-9"
                {...register("chatbot.rateLimitPerMinute", {
                  valueAsNumber: true,
                })}
              />
              <p className="text-xs text-muted-foreground">
                Max messages a single visitor can send each minute.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Ticket Rate Limit / hour
              </Label>
              <Input
                type="number"
                className="h-9"
                {...register("chatbot.ticketRateLimitPerHour", {
                  valueAsNumber: true,
                })}
              />
              <p className="text-xs text-muted-foreground">
                Max support tickets a visitor can open each hour.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/90 px-4 py-3 shadow-lg backdrop-blur supports-backdrop-filter:bg-background/75">
            <p className="text-xs text-muted-foreground">
              {isDirty
                ? "You have unsaved changes."
                : "Changes take effect after saving."}
            </p>
            <Button type="submit" disabled={isSaving || !isDirty}>
              {isSaving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
