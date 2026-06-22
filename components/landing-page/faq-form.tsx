"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  HelpCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FAQItem } from "@/types/landing-page";
import { updateLandingPageContent } from "@/actions/landing-page";

interface FAQFormProps {
  faq: FAQItem[];
}

export function FAQForm({ faq: initialFaq }: FAQFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [faq, setFaq] = useState<FAQItem[]>(initialFaq);

  const addItem = () => {
    setFaq((current) => [
      ...current,
      {
        id: Date.now().toString(),
        question: "New question",
        answer: "Add the answer here.",
        enabled: true,
        order: current.length + 1,
      },
    ]);
  };

  const updateItem = (id: string, updates: Partial<FAQItem>) => {
    setFaq((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  };

  const removeItem = (id: string) => {
    setFaq((current) => current.filter((item) => item.id !== id));
  };

  const toggleEnabled = (id: string) => {
    setFaq((current) =>
      current.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateLandingPageContent({ faq });
      if (result.success) {
        toast.success("FAQ section updated successfully");
      } else {
        toast.error(result.error || "Failed to update FAQ section");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-0 p-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <HelpCircle className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-xl">FAQ</CardTitle>
              <CardDescription className="mt-1">
                Edit the common support questions and answers shown on the homepage.
              </CardDescription>
            </div>
          </div>
          <Button onClick={addItem} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {faq.map((item, index) => (
          <div
            key={item.id}
            className={`rounded-xl border bg-muted/20 p-5 space-y-4 transition-all hover:bg-muted/30 ${
              !item.enabled ? "opacity-60 bg-muted/50" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Question #{index + 1}
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleEnabled(item.id)}
                className="h-8 w-8 p-0"
              >
                {item.enabled ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Question</Label>
              <Input
                value={item.question}
                onChange={(e) =>
                  updateItem(item.id, { question: e.target.value })
                }
                className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Answer</Label>
              <Textarea
                value={item.answer}
                onChange={(e) =>
                  updateItem(item.id, { answer: e.target.value })
                }
                rows={3}
                className="bg-background/80 border-input/50 focus:border-primary transition-colors resize-none"
              />
            </div>
          </div>
        ))}

        <div className="flex justify-end py-2">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="h-11 px-6 shadow-md hover:shadow-lg transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save FAQ
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
