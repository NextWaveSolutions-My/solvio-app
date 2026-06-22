"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, MousePointerClick } from "lucide-react";
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
import { ContactCtaSection } from "@/types/landing-page";
import { updateLandingPageContent } from "@/actions/landing-page";

interface ContactCtaFormProps {
  contactCta: ContactCtaSection;
}

export function ContactCtaForm({ contactCta }: ContactCtaFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [values, setValues] = useState(contactCta);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateLandingPageContent({ contactCta: values });
      if (result.success) {
        toast.success("Contact CTA updated successfully");
      } else {
        toast.error(result.error || "Failed to update contact CTA");
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
            <MousePointerClick className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <CardTitle className="text-xl">Contact CTA</CardTitle>
            <CardDescription className="mt-1">
              Configure the closing support CTA and compact contact-form copy.
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
              rows={3}
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

        <div className="rounded-xl border bg-muted/20 p-5 space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Contact Form Title</Label>
            <Input
              value={values.formTitle}
              onChange={(e) =>
                setValues((current) => ({ ...current, formTitle: e.target.value }))
              }
              className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Contact Form Description</Label>
            <Textarea
              value={values.formDescription}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  formDescription: e.target.value,
                }))
              }
              rows={3}
              className="bg-background/80 border-input/50 focus:border-primary transition-colors resize-none"
            />
          </div>
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
                Save Contact CTA
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
