"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import type { AIFilePublic, AISitePublic } from "@/types";
import { SiteSelect } from "@/components/ai-training/site-select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  listFiles,
  uploadAndIndexFile,
  deleteFile,
  updateFileSite,
} from "@/actions/ai-files";

const ACCEPT =
  ".pdf,.xlsx,.xls,.xlsm,.csv,.tsv,.docx,.doc,.txt,.md,.markdown,.text,.log";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function FileTypeIcon({ type }: { type: string }) {
  if (type === "spreadsheet")
    return <FileSpreadsheet className="h-4 w-4 text-success" />;
  if (type === "pdf") return <FileText className="h-4 w-4 text-destructive" />;
  if (type === "document")
    return <FileText className="h-4 w-4 text-info" />;
  return <FileIcon className="h-4 w-4 text-muted-foreground" />;
}

function StatusBadge({ file }: { file: AIFilePublic }) {
  if (file.status === "ready") {
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
  if (file.status === "failed") {
    return (
      <Badge
        variant="outline"
        className="border-destructive/40 bg-destructive/10 text-destructive"
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-info/40 bg-info/10 text-info">
      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
      Processing
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

function UploadDialog({
  onUploaded,
  sites,
}: {
  onUploaded: () => void;
  sites: AISitePublic[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [siteId, setSiteId] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setFile(null);
    setSiteId("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Choose a file first");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (name.trim()) fd.append("name", name.trim());
      if (siteId) fd.append("siteId", siteId);
      const result = await uploadAndIndexFile(fd);
      if (result.success && result.data) {
        toast.success(`Indexed “${result.data.name}” (${result.data.chunksIndexed} chunks)`);
        reset();
        setOpen(false);
        onUploaded();
      } else {
        toast.error(result.error ?? "Failed to index file");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          Upload File
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a document</DialogTitle>
          <DialogDescription>
            PDF, Excel/CSV, Word (.docx), or text/markdown. The file is parsed,
            chunked, embedded, and added to the knowledge base so the AI can
            answer from it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="file-input">File</Label>
            <Input
              id="file-input"
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !name.trim()) setName(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} · {formatBytes(file.size)}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="file-name">Display name</Label>
            <Input
              id="file-name"
              placeholder="e.g. Pricing Sheet 2026"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <SiteSelect
            id="file-site"
            value={siteId}
            onChange={setSiteId}
            sites={sites}
            disabled={uploading}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading || !file}>
            {uploading && (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            )}
            {uploading ? "Indexing…" : "Upload & index"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FilesPanel({
  initialFiles,
  sites = [],
}: {
  initialFiles: AIFilePublic[];
  sites?: AISitePublic[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState(initialFiles);
  const [busyId, setBusyId] = useState<string | null>(null);
  const siteName = (id?: string) =>
    id ? sites.find((s) => s._id === id)?.name : undefined;

  const refresh = useCallback(async () => {
    const result = await listFiles();
    if (result.success && result.data) setFiles(result.data);
  }, []);

  const handleDelete = async (id: string) => {
    setBusyId(id);
    try {
      const result = await deleteFile(id);
      if (result.success) {
        toast.success("File removed");
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
    const current = files.find((f) => f._id === id)?.siteId ?? "";
    if (current === nextSiteId) return;
    setBusyId(id);
    setFiles((prev) =>
      prev.map((f) =>
        f._id === id ? { ...f, siteId: nextSiteId || undefined } : f
      )
    );
    try {
      const result = await updateFileSite(id, {
        siteId: nextSiteId || undefined,
      });
      if (result.success && result.data) {
        toast.success("File scope updated");
        setFiles((prev) =>
          prev.map((f) => (f._id === id ? result.data! : f))
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

  const totalChunks = files.reduce((n, f) => n + f.chunksIndexed, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-primary" />
              Files
            </CardTitle>
            <CardDescription>
              {files.length === 0
                ? "Upload PDFs, spreadsheets or documents to learn from."
                : `${files.length} file${files.length === 1 ? "" : "s"} · ${totalChunks} chunks embedded`}
            </CardDescription>
          </div>
          <UploadDialog onUploaded={refresh} sites={sites} />
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
              <Upload className="mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                No files yet
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Upload a PDF, Excel/CSV, Word doc or text file. It is parsed,
                embedded, and the AI answers from it automatically.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {files.map((f) => (
                <li
                  key={f._id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileTypeIcon type={f.fileType} />
                      <span className="truncate font-medium text-foreground">
                        {f.name}
                      </span>
                      <StatusBadge file={f} />
                      <Badge variant="outline" className="text-[10px]">
                        {siteName(f.siteId) ?? "Global"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {f.status === "ready"
                        ? `${f.filename} · ${formatBytes(f.sizeBytes)} · ${f.chunksIndexed} chunks · ${formatDate(f.createdAt)}`
                        : f.status === "failed"
                          ? (f.error ?? "Indexing failed")
                          : `${f.filename} · ${formatBytes(f.sizeBytes)}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    <ScopeSelect
                      value={f.siteId ?? ""}
                      sites={sites}
                      disabled={busyId === f._id || f.status === "processing"}
                      onChange={(value) => handleScopeChange(f._id, value)}
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-destructive hover:text-destructive"
                          disabled={
                            busyId === f._id || f.status === "processing"
                          }
                        >
                          {busyId === f._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove file</AlertDialogTitle>
                          <AlertDialogDescription>
                            Delete <strong>{f.name}</strong> and its{" "}
                            {f.chunksIndexed} embedded chunks from the
                            knowledge base? This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(f._id)}
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
