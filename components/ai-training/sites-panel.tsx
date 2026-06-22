"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Check,
  Code2,
  Copy,
  Globe,
  KeyRound,
  Loader2,
  Plus,
  SquareCode,
  Trash2,
} from "lucide-react";
import type { AISitePublic } from "@/types";
import {
  DEFAULT_WIDGET_HEIGHT,
  DEFAULT_WIDGET_WIDTH,
} from "@/lib/ai/widget-theme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  listSites,
  createSite,
  updateSite,
  deleteSite,
  rotateSiteKey,
} from "@/actions/ai-sites";

/** A small copy-to-clipboard button shared by the snippet and key rows. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="h-8 w-8 shrink-0"
      title={`Copy ${label}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(`${label} copied`);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Couldn't copy — copy manually");
        }
      }}
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

/** A read-only code block with a copy button (shared by every snippet). */
function SnippetRow({ code, label }: { code: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <pre className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-border bg-muted/50 p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <CopyButton value={code} label={label} />
    </div>
  );
}

function parseDomains(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((d) => d.trim())
    .filter(Boolean);
}

function SiteDialog({
  site,
  trigger,
  onSaved,
}: {
  site?: AISitePublic;
  trigger: React.ReactNode;
  onSaved: () => void;
}) {
  const isEditing = !!site;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(site?.name ?? "");
  const [domains, setDomains] = useState((site?.domains ?? []).join(", "));
  const [submitting, setSubmitting] = useState(false);

  // Reset fields whenever the dialog (re)opens so stale edits don't linger.
  useEffect(() => {
    if (open) {
      setName(site?.name ?? "");
      setDomains((site?.domains ?? []).join(", "));
    }
  }, [open, site]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Enter a site name");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { name: name.trim(), domains: parseDomains(domains) };
      const result = isEditing
        ? await updateSite(site._id, payload)
        : await createSite(payload);
      if (result.success) {
        toast.success(isEditing ? "Site updated" : "Site created");
        setOpen(false);
        onSaved();
      } else {
        toast.error(result.error ?? "Failed to save site");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit site" : "Add a site"}</DialogTitle>
          <DialogDescription>
            A site is a knowledge scope. Assign sources (web crawls, files, Q&amp;A
            pairs) to it, then embed its snippet — the bot answers only from that
            site&apos;s sources plus anything marked Global.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="site-name">Name</Label>
            <Input
              id="site-name"
              placeholder="e.g. Acme Store"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site-domains">Allowed domains (optional)</Label>
            <Input
              id="site-domains"
              placeholder="acme.com, shop.acme.com"
              value={domains}
              onChange={(e) => setDomains(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated. When set, the widget only answers for this site
              when embedded on these hosts. Leave blank to allow any host.
            </p>
          </div>
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
            {submitting && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            {isEditing ? "Save changes" : "Create site"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SitesPanel({
  initialSites,
  appUrl,
  widgetWidth = DEFAULT_WIDGET_WIDTH,
  widgetHeight = DEFAULT_WIDGET_HEIGHT,
}: {
  initialSites: AISitePublic[];
  appUrl: string;
  widgetWidth?: number;
  widgetHeight?: number;
}) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Prefer the server-provided app URL; fall back to the current origin.
  const [origin, setOrigin] = useState(appUrl);
  useEffect(() => {
    if (!appUrl && typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [appUrl]);
  const base = origin || "https://your-app.com";
  const globalSnippet = `<script src="${base}/widget.js" async></script>`;
  const iframeSnippet = `<iframe src="${base}/embed" title="Live chat" allow="clipboard-write" style="border:0;width:${widgetWidth}px;height:${widgetHeight}px;"></iframe>`;

  const refresh = async () => {
    const result = await listSites();
    if (result.success && result.data) setSites(result.data);
    // Source badges elsewhere depend on the site list too.
    router.refresh();
  };

  const handleToggle = async (site: AISitePublic, enabled: boolean) => {
    setBusyId(site._id);
    // Optimistic flip; revert on failure.
    setSites((prev) =>
      prev.map((s) => (s._id === site._id ? { ...s, enabled } : s))
    );
    try {
      const result = await updateSite(site._id, { enabled });
      if (!result.success) {
        toast.error(result.error ?? "Failed to update");
        setSites((prev) =>
          prev.map((s) =>
            s._id === site._id ? { ...s, enabled: !enabled } : s
          )
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleRotate = async (id: string) => {
    setBusyId(id);
    try {
      const result = await rotateSiteKey(id);
      if (result.success) {
        toast.success("Key rotated — update the embed snippet on that site");
        await refresh();
      } else {
        toast.error(result.error ?? "Failed to rotate key");
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const result = await deleteSite(id);
      if (result.success) {
        toast.success("Site deleted");
        await refresh();
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Global bot — paste anywhere to answer from ALL knowledge. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4 text-primary" />
            Global widget — answers from all knowledge
          </CardTitle>
          <CardDescription>
            Paste this just before the closing{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              &lt;/body&gt;
            </code>{" "}
            tag of any website. A chat bubble floats in the corner and answers
            from <strong>everything</strong> you&apos;ve trained. Use a site
            below instead to answer from just one site&apos;s sources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SnippetRow code={globalSnippet} label="Snippet" />
        </CardContent>
      </Card>

      {/* 2. Per-site bots — each scoped to its own sources (+ global). */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Code2 className="h-4 w-4 text-primary" />
              Per-site widgets
            </CardTitle>
            <CardDescription>
              {sites.length === 0
                ? "Add a site to make the widget answer from only that site's sources (plus anything marked Global)."
                : `${sites.length} site${sites.length === 1 ? "" : "s"}. Each snippet answers from that site's sources plus Global.`}
            </CardDescription>
          </div>
          <SiteDialog
            onSaved={refresh}
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add site
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center">
              <Globe className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No sites yet. Use the Global snippet above, or add a site to
                scope answers per website.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {sites.map((s) => (
                <SiteRow
                  key={s._id}
                  site={s}
                  base={base}
                  busy={busyId === s._id}
                  onToggle={(enabled) => handleToggle(s, enabled)}
                  onRotate={() => handleRotate(s._id)}
                  onDelete={() => handleDelete(s._id)}
                  onSaved={refresh}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 3. Advanced: inline iframe + domain locking. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <SquareCode className="h-4 w-4 text-primary" />
            Other ways to embed
          </CardTitle>
          <CardDescription>
            For platforms that block scripts but allow an HTML/iframe block. It
            renders inline where you place it (no floating bubble). For one
            site, add{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              ?key=SITE_KEY
            </code>{" "}
            to the URL.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <SnippetRow code={iframeSnippet} label="Inline snippet" />
          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Restrict where it loads</p>
            <p className="mt-1">
              By default the widget can be embedded anywhere. To lock it to
              specific domains, set the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                EMBED_ALLOWED_ORIGINS
              </code>{" "}
              environment variable to a comma-separated list of origins and
              redeploy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SiteRow({
  site,
  base,
  busy,
  onToggle,
  onRotate,
  onDelete,
  onSaved,
}: {
  site: AISitePublic;
  base: string;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
  onRotate: () => void;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const snippet = useMemo(
    () => `<script src="${base}/widget.js?key=${site.key}" async></script>`,
    [base, site.key]
  );

  return (
    <li className="space-y-3 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {site.name}
            </span>
            {!site.enabled && (
              <Badge variant="outline" className="text-[10px]">
                Disabled
              </Badge>
            )}
            {site.domains.length > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {site.domains.length} domain
                {site.domains.length === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          {site.domains.length > 0 && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {site.domains.join(", ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="mr-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Enabled</span>
            <Switch
              checked={site.enabled}
              disabled={busy}
              onCheckedChange={onToggle}
            />
          </div>
          <SiteDialog
            site={site}
            onSaved={onSaved}
            trigger={
              <Button variant="outline" size="sm" disabled={busy}>
                Edit
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={busy} title="Rotate key">
                <KeyRound className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rotate this site&apos;s key?</AlertDialogTitle>
                <AlertDialogDescription>
                  The current embed snippet for <strong>{site.name}</strong> will
                  stop scoping answers until you replace it with the new one.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onRotate}>
                  Rotate key
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                className="text-destructive hover:text-destructive"
                title="Delete site"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {site.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This only works once no sources are assigned to it. Reassign or
                  remove its web sources, files and Q&amp;A pairs first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Embed snippet for this site */}
      <SnippetRow code={snippet} label="Snippet" />
    </li>
  );
}
