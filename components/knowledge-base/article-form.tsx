"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TiptapEditor } from "@/components/knowledge-base/tiptap-editor";
import { createKBArticle, updateKBArticle } from "@/actions/knowledge-base";
import type { KBArticle } from "@/types";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.string(),
  excerpt: z.string().max(300).optional(),
  sortOrder: z.number().int(),
  isPublished: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface ArticleFormProps {
  categoryId: string;
  categorySlug: string;
  article?: KBArticle & { _id: { toString(): string } };
}

export function ArticleForm({
  categoryId,
  categorySlug,
  article,
}: ArticleFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!article;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: article?.title ?? "",
      content: article?.content ?? "",
      excerpt: article?.excerpt ?? "",
      sortOrder: article?.sortOrder ?? 0,
      isPublished: article?.isPublished ?? false,
    },
  });

  const isPublished = watch("isPublished");

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      let result;
      if (isEditing) {
        result = await updateKBArticle(article._id.toString(), {
          ...data,
          categoryId,
          categorySlug,
        });
      } else {
        result = await createKBArticle({ ...data, categoryId, categorySlug });
      }

      if (result.success) {
        toast.success(isEditing ? "Article updated" : "Article created");
        router.push(`/admin/knowledge-base/${categoryId}`);
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Title + Sort Order */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-3 space-y-1.5">
          <Label htmlFor="title" className="text-xs font-medium">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g. How to get started"
            className="h-9"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sortOrder" className="text-xs font-medium">
            Sort Order
          </Label>
          <Input
            id="sortOrder"
            type="number"
            placeholder="0"
            className="h-9"
            {...register("sortOrder", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Excerpt */}
      <div className="space-y-1.5">
        <Label htmlFor="excerpt" className="text-xs font-medium">
          Excerpt{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="excerpt"
          placeholder="Short summary shown in article lists and search results..."
          rows={2}
          className="resize-none text-sm"
          {...register("excerpt")}
        />
        {errors.excerpt && (
          <p className="text-xs text-destructive">{errors.excerpt.message}</p>
        )}
      </div>

      {/* Content editor */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Content</Label>
        <div className="rounded-lg border border-border overflow-hidden">
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TiptapEditor
                value={field.value}
                onChange={field.onChange}
                placeholder="Write your article content here..."
              />
            )}
          />
        </div>
      </div>

      {/* Publish toggle */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2.5">
          {isPublished ? (
            <Eye className="h-4 w-4 text-green-500" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-sm font-medium">
              {isPublished ? "Published" : "Draft"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPublished
                ? "Visible on public docs"
                : "Hidden from public docs"}
            </p>
          </div>
        </div>
        <Switch
          id="isPublished"
          checked={isPublished}
          onCheckedChange={(v) => setValue("isPublished", v)}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Article"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/admin/knowledge-base/${categoryId}`)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
