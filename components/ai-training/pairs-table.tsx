"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SearchInput } from "@/components/shared/search-input";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DEFAULT_DATA_TABLE_PAGE_SIZE_OPTIONS } from "@/hooks/use-data-table-pagination";
import { DeletePairButton } from "@/components/ai-training/delete-pair-button";
import { toggleAITrainingPairActive } from "@/actions/ai-training";
import type { AITrainingPairPublic } from "@/types";

interface PairsTableProps {
  pairs: AITrainingPairPublic[];
  categories: string[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  initialSearch: string;
  initialCategory: string;
}

const statusVariants: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  generated: { label: "Ready", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
};

export function PairsTable({
  pairs,
  categories,
  total,
  page,
  pageSize,
  initialCategory,
}: PairsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const updateQuery = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    for (const [k, v] of Object.entries(updates)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => {
      router.push(`/admin/ai-support-agent?${params.toString()}`);
    });
  };

  const handleToggleActive = async (id: string, next: boolean) => {
    const result = await toggleAITrainingPairActive(id, next);
    if (result.success) {
      toast.success(next ? "Pair activated" : "Pair deactivated");
      router.refresh();
    } else {
      toast.error(result.error ?? "Failed to update");
    }
  };

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <Card className="border-border rounded-md gap-3 p-4 shadow-none sm:p-4">
      {/* Header: search + filter (matches tickets page) */}
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <div className="w-full sm:flex-1">
          <SearchInput
            placeholder="Search questions or answers..."
            className="w-full md:flex-1"
            inputClassName="w-full md:w-full"
          />
        </div>

        <Select
          defaultValue={initialCategory || "all"}
          onValueChange={(v) =>
            updateQuery({ category: v === "all" ? undefined : v, page: "1" })
          }
        >
          <SelectTrigger className="h-9 w-full shrink-0 text-sm sm:w-45">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {pairs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 py-16 text-center">
          <h3 className="text-base font-semibold">No training pairs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first Q&amp;A pair to start training the AI.
          </p>
        </div>
      ) : (
        <div className="rounded-md overflow-hidden border border-border bg-card/50 backdrop-blur-sm">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/20 hover:bg-muted/20">
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider w-[40%]">
                  Question
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Category
                </TableHead>
                <TableHead className="h-12 px-4 text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Status
                </TableHead>
                <TableHead className="h-12 px-4 text-center text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider">
                  Active
                </TableHead>
                <TableHead className="h-12 px-4 text-right text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider w-25">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-background/50">
              {pairs.map((p) => {
                const status =
                  statusVariants[p.embeddingStatus] ?? statusVariants.pending;
                const id = p._id;
                return (
                  <TableRow
                    key={id}
                    className="border-b border-border/30 hover:bg-muted/30 transition-all duration-200 group"
                  >
                    <TableCell className="py-3.5 px-4 max-w-md">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {p.question}
                      </p>
                      <p className="truncate text-xs text-muted-foreground/60 mt-0.5">
                        {p.answer}
                      </p>
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <Badge variant="outline" className="font-normal">
                        {p.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 px-4">
                      <Badge
                        variant={status.variant}
                        className="font-normal"
                        title={p.embeddingError ?? undefined}
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-center">
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={(v) => handleToggleActive(id, v)}
                      />
                    </TableCell>
                    <TableCell className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8"
                        >
                          <Link href={`/admin/ai-support-agent/${id}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        <DeletePairButton id={id} question={p.question} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <DataTablePagination
            page={page}
            pageSize={pageSize}
            pageSizeOptions={DEFAULT_DATA_TABLE_PAGE_SIZE_OPTIONS}
            totalItems={total}
            startItem={startItem}
            endItem={endItem}
            onPageChange={(next) => updateQuery({ page: String(next) })}
            onPageSizeChange={(size) =>
              updateQuery({ limit: String(size), page: "1" })
            }
          />
        </div>
      )}
    </Card>
  );
}
