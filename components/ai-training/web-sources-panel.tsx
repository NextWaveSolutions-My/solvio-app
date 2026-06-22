"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { AISitePublic, AIWebSourcePublic } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteSelect } from "@/components/ai-training/site-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listWebSources,
  createWebSource,
  reindexWebSource,
  deleteWebSource,
  updateWebSourceSite,
} from "@/actions/ai-web-sources";

const ACTIVE_STATUSES = new Set(["queued", "crawling"]);

function isActive(sources: AIWebSourcePublic[]): boolean {
  return sources.some((s) => ACTIVE_STATUSES.has(s.status));
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function StatusBadge({ source }: { source: AIWebSourcePublic }) {
  if (source.status === "ready") {
    return (
      <Badge
        variant="outline"
        className="border-success/40 bg-success/10 text-success"
      >
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Ready
      </Badge>
    );
  }
  if (source.status === "failed") {
    return (
      <Badge
        variant="outline"
        className="border-destructive/40 bg-destructive/10 text-destructive"
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        Index failed
      </Badge>
    );
  }
  if (source.status === "crawling") {
    const p = source.progress;
    const label =
      p && p.total > 0
        ? `${p.phase} ${p.visited}/${p.total}`
        : (p?.phase ?? "Indexing…");
    return (
      <Badge
        variant="outline"
        className="border-info/40 bg-info/10 text-info"
      >
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-muted-foreground/30 bg-muted text-muted-foreground"
    >
      <Clock className="mr-1 h-3 w-3" />
      Queued
    </Badge>
  );
}

function ScopeSelect({
  value,
  sites,
  disabled,
  onChange,
}: {
  value: string;
  sites: AISitePublic[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label="Knowledge scope"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-44"
    >
      <option value="">Global</option>
      {sites.map((s) => (
        <option key={s._id} value={s._id}>
          {s.name}
          {s.enabled ? "" : " (disabled)"}
        </option>
      ))}
    </select>
  );
}

const MAX_PAGES_CEILING = 500;
const DEFAULT_MAX_PAGES = 100;

function AddSourceDialog({
  onAdded,
  sites,
}: {
  onAdded: () => void;
  sites: AISitePublic[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [maxPages, setMaxPages] = useState(String(DEFAULT_MAX_PAGES));
  const [siteId, setSiteId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !url.trim()) {
      toast.error("Enter a name and a URL");
      return;
    }
    const pages = Math.round(Number(maxPages));
    if (!Number.isFinite(pages) || pages < 1 || pages > MAX_PAGES_CEILING) {
      toast.error(`Max pages must be between 1 and ${MAX_PAGES_CEILING}`);
      return;
    }
    setSubmitting(true);
    try {
      const result = await createWebSource({
        name: name.trim(),
        url: url.trim(),
        maxPages: pages,
        siteId: siteId || undefined,
      });
      if (result.success) {
        toast.success("Crawl started — indexing in the background");
        setName("");
        setUrl("");
        setMaxPages(String(DEFAULT_MAX_PAGES));
        setSiteId("");
        setOpen(false);
        onAdded();
      } else {
        toast.error(result.error ?? "Failed to add source");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add URL
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a website</DialogTitle>
          <DialogDescription>
            Enter a name and an entry URL. The crawler visits pages across the
            same domain, then learns and embeds their content so the AI can
            answer from it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Name</Label>
            <Input
              id="ws-name"
              placeholder="e.g. Product Docs"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-url">URL</Label>
            <Input
              id="ws-url"
              type="url"
              placeholder="https://docs.example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ws-max-pages">Max pages</Label>
            <Input
              id="ws-max-pages"
              type="number"
              min={1}
              max={MAX_PAGES_CEILING}
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Upper limit on pages crawled across the whole domain (1–
              {MAX_PAGES_CEILING}). Raise it for large sites; higher values take
              longer and cost more to embed.
            </p>
          </div>
          <SiteSelect
            id="ws-site"
            value={siteId}
            onChange={setSiteId}
            sites={sites}
            disabled={submitting}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Start indexing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WebSourcesPanel({
  initialSources,
  sites = [],
}: {
  initialSources: AIWebSourcePublic[];
  sites?: AISitePublic[];
}) {
  const router = useRouter();
  const [sources, setSources] = useState(initialSources);
  const siteName = (id?: string) =>
    id ? sites.find((s) => s._id === id)?.name : undefined;
  const [busyId, setBusyId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    const result = await listWebSources();
    if (result.success && result.data) setSources(result.data);
  }, []);

  // Poll only while a crawl is in flight, then stop to avoid idle traffic.
  useEffect(() => {
    if (!isActive(sources)) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(() => {
      void refresh();
    }, 2500);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [sources, refresh]);

  const handleReindex = async (id: string) => {
    setBusyId(id);
    try {
      const result = await reindexWebSource(id);
      if (result.success) {
        toast.success("Re-indexing started");
        await refresh();
      } else {
        toast.error(result.error ?? "Failed to re-index");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const result = await deleteWebSource(id);
      if (result.success) {
        toast.success("Source removed");
        await refresh();
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleScopeChange = async (id: string, nextSiteId: string) => {
    const current = sources.find((s) => s._id === id)?.siteId ?? "";
    if (current === nextSiteId) return;
    setBusyId(id);
    setSources((prev) =>
      prev.map((s) =>
        s._id === id ? { ...s, siteId: nextSiteId || undefined } : s
      )
    );
    try {
      const result = await updateWebSourceSite(id, {
        siteId: nextSiteId || undefined,
      });
      if (result.success && result.data) {
        toast.success("Source scope updated");
        setSources((prev) =>
          prev.map((s) => (s._id === id ? result.data! : s))
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to update scope");
        await refresh();
      }
    } finally {
      setBusyId(null);
    }
  };

  const totalPages = sources.reduce((n, s) => n + s.pagesIndexed, 0);
  const totalChunks = sources.reduce((n, s) => n + s.chunksIndexed, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4 text-primary" />
              Website Sources
            </CardTitle>
            <CardDescription>
              {sources.length === 0
                ? "Add a website to crawl and learn from."
                : `${sources.length} source${sources.length === 1 ? "" : "s"} · ` +
                  `${totalPages} pages · ${totalChunks} chunks embedded`}
            </CardDescription>
          </div>
          <AddSourceDialog onAdded={refresh} sites={sites} />
        </CardHeader>
        <CardContent>
          {sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <Globe className="mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                No websites yet
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Add a documentation site, help center or any public URL. The AI
                crawls it, embeds the content and answers from it automatically.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sources.map((s) => (
                <li
                  key={s._id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-foreground">
                        {s.name}
                      </span>
                      <StatusBadge source={s} />
                      <Badge variant="outline" className="text-[10px]">
                        {siteName(s.siteId) ?? "Global"}
                      </Badge>
                    </div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {s.url}
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {s.status === "ready"
                        ? `${s.pagesIndexed} pages · ${s.chunksIndexed} chunks · indexed ${formatDate(
                            s.lastCrawledAt
                          )}`
                        : s.status === "failed"
                          ? (s.error ?? "Indexing failed")
                          : `Up to ${s.maxPages} pages`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <ScopeSelect
                      value={s.siteId ?? ""}
                      sites={sites}
                      disabled={
                        busyId === s._id || ACTIVE_STATUSES.has(s.status)
                      }
                      onChange={(value) => handleScopeChange(s._id, value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReindex(s._id)}
                      disabled={
                        busyId === s._id || ACTIVE_STATUSES.has(s.status)
                      }
                    >
                      {busyId === s._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1.5 hidden sm:inline">Re-index</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={
                            busyId === s._id || ACTIVE_STATUSES.has(s.status)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove web source</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete <strong>{s.name}</strong> and all{" "}
                            {s.chunksIndexed} embedded chunks from the knowledge
                            base? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(s._id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
