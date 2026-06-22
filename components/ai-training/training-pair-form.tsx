"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  createAITrainingPair,
  updateAITrainingPair,
} from "@/actions/ai-training";
import { SiteSelect } from "@/components/ai-training/site-select";
import type { AISitePublic, AITrainingPairPublic } from "@/types";

const schema = z.object({
  question: z.string().min(1, "Question is required").max(1000),
  answer: z.string().min(1, "Answer is required").max(5000),
  category: z.string().max(100),
  isActive: z.boolean(),
  siteId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface TrainingPairFormProps {
  pair?: AITrainingPairPublic;
  sites?: AISitePublic[];
}

export function TrainingPairForm({ pair, sites = [] }: TrainingPairFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!pair;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      question: pair?.question ?? "",
      answer: pair?.answer ?? "",
      category: pair?.category ?? "General",
      isActive: pair?.isActive ?? true,
      siteId: pair?.siteId ?? "",
    },
  });

  const isActive = watch("isActive");
  const siteId = watch("siteId") ?? "";

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      const result = isEditing
        ? await updateAITrainingPair(pair._id, data)
        : await createAITrainingPair(data);

      if (result.success) {
        toast.success(isEditing ? "Pair updated" : "Pair created");
        router.push("/admin/ai-support-agent");
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="question" className="text-xs font-medium">
          Question <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="question"
          placeholder="e.g. How do I reset my password?"
          rows={2}
          className="resize-none text-sm"
          {...register("question")}
        />
        {errors.question && (
          <p className="text-xs text-destructive">{errors.question.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Changing the question will regenerate its embedding.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="answer" className="text-xs font-medium">
          Answer <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="answer"
          placeholder="The approved response..."
          rows={6}
          className="resize-none text-sm"
          {...register("answer")}
        />
        {errors.answer && (
          <p className="text-xs text-destructive">{errors.answer.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category" className="text-xs font-medium">
          Category
        </Label>
        <Input
          id="category"
          placeholder="General"
          className="h-9"
          {...register("category")}
        />
      </div>

      <SiteSelect
        id="pair-site"
        value={siteId}
        onChange={(v) => setValue("siteId", v)}
        sites={sites}
        disabled={isLoading}
      />

      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div>
          <p className="text-sm font-medium">
            {isActive ? "Active" : "Inactive"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isActive
              ? "Used for matching customer questions"
              : "Hidden from matching"}
          </p>
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={(v) => setValue("isActive", v)}
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={isLoading} className="flex-1">
          {isLoading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          {isEditing ? "Save Changes" : "Create Pair"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/ai-support-agent")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
