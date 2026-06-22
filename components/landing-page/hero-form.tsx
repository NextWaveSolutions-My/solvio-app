"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Type, Plus, Trash2 } from "lucide-react";
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
import { HeroMetric, HeroSection } from "@/types/landing-page";
import { updateLandingPageContent } from "@/actions/landing-page";

interface HeroFormProps {
  hero: HeroSection;
}

export function HeroForm({ hero }: HeroFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [values, setValues] = useState(hero);

  const updateMetric = (id: string, updates: Partial<HeroMetric>) => {
    setValues((current) => ({
      ...current,
      metrics: current.metrics.map((metric) =>
        metric.id === id ? { ...metric, ...updates } : metric,
      ),
    }));
  };

  const addMetric = () => {
    setValues((current) => ({
      ...current,
      metrics: [
        ...current.metrics,
        {
          id: Date.now().toString(),
          value: "New",
          label: "Metric label",
        },
      ],
    }));
  };

  const removeMetric = (id: string) => {
    setValues((current) => ({
      ...current,
      metrics: current.metrics.filter((metric) => metric.id !== id),
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateLandingPageContent({ hero: values });
      if (result.success) {
        toast.success("Hero section updated successfully");
      } else {
        toast.error(result.error || "Failed to update hero section");
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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Type className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Hero Section</CardTitle>
            <CardDescription className="mt-1">
              Configure the top-level support promise, CTAs, and proof metrics.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="rounded-xl border bg-muted/20 p-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Eyebrow</Label>
            <Input
              value={values.eyebrow}
              onChange={(e) =>
                setValues((current) => ({ ...current, eyebrow: e.target.value }))
              }
              className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Headline</Label>
            <Textarea
              value={values.headline}
              onChange={(e) =>
                setValues((current) => ({ ...current, headline: e.target.value }))
              }
              rows={3}
              className="bg-background/80 border-input/50 focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <Textarea
              value={values.description}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  description: e.target.value,
                }))
              }
              rows={4}
              className="bg-background/80 border-input/50 focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-5 space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Primary CTA Text</Label>
              <Input
                value={values.primaryButtonText}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    primaryButtonText: e.target.value,
                  }))
                }
                className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Primary CTA Link</Label>
              <Input
                value={values.primaryButtonLink}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    primaryButtonLink: e.target.value,
                  }))
                }
                className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Secondary CTA Text</Label>
              <Input
                value={values.secondaryButtonText}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    secondaryButtonText: e.target.value,
                  }))
                }
                className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Secondary CTA Link</Label>
              <Input
                value={values.secondaryButtonLink}
                onChange={(e) =>
                  setValues((current) => ({
                    ...current,
                    secondaryButtonLink: e.target.value,
                  }))
                }
                className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium">Proof Metrics</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Short stats shown directly under the hero actions.
              </p>
            </div>
            <Button onClick={addMetric} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Metric
            </Button>
          </div>

          {values.metrics.map((metric, index) => (
            <div
              key={metric.id}
              className="rounded-xl border bg-background/70 p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Metric #{index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeMetric(metric.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Value</Label>
                  <Input
                    value={metric.value}
                    onChange={(e) =>
                      updateMetric(metric.id, { value: e.target.value })
                    }
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Label</Label>
                  <Input
                    value={metric.label}
                    onChange={(e) =>
                      updateMetric(metric.id, { label: e.target.value })
                    }
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

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
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
