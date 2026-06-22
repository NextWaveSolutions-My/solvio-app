"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { createKBCategory, updateKBCategory } from "@/actions/knowledge-base";
import { CoverImageUploader } from "@/components/knowledge-base/cover-image-uploader";
import type { KBCategory } from "@/types";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  coverImage: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal("")),
  sortOrder: z.number().int(),
  isPublished: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface CategoryFormProps {
  category?: KBCategory & { _id: { toString(): string } };
}

export function CategoryForm({ category }: CategoryFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!category;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: category?.title ?? "",
      description: category?.description ?? "",
      icon: category?.icon ?? "",
      coverImage: category?.coverImage ?? "",
      sortOrder: category?.sortOrder ?? 0,
      isPublished: category?.isPublished ?? false,
    },
  });

  const isPublished = watch("isPublished");

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      let result;
      if (isEditing) {
        result = await updateKBCategory(category._id.toString(), data);
      } else {
        result = await createKBCategory(data);
      }

      if (result.success) {
        toast.success(isEditing ? "Category updated" : "Category created");
        if (!isEditing && result.data?.id) {
          router.push(`/admin/knowledge-base/${result.data.id}`);
        }
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Title + Icon */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="title" className="text-xs font-medium">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder="e.g. Getting Started"
            className="h-9"
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{errors.title.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="icon" className="text-xs font-medium">
            Icon (emoji)
          </Label>
          <Input
            id="icon"
            placeholder="📚"
            maxLength={10}
            className="h-9 text-center text-lg"
            {...register("icon")}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Brief description of this category..."
          rows={3}
          className="resize-none text-sm"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Cover Image */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Cover Image</Label>
        <CoverImageUploader
          value={watch("coverImage")}
          onChange={(url) => setValue("coverImage", url, { shouldValidate: true })}
        />
        {errors.coverImage && (
          <p className="text-xs text-destructive">
            {errors.coverImage.message}
          </p>
        )}
      </div>

      {/* Sort Order */}
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
        <Button type="submit" size="sm" disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Category"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/knowledge-base")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
