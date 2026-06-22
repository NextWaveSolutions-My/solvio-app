"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, Layout } from "lucide-react";
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
import { FooterSection } from "@/types/landing-page";
import { updateLandingPageContent } from "@/actions/landing-page";

interface FooterFormProps {
  footer: FooterSection;
}

type LinkItem = { label: string; href: string };
type LinkCategory = "product" | "resources" | "company" | "legal";

export function FooterForm({ footer }: FooterFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [links, setLinks] = useState(footer.links);

  const form = useForm<Omit<FooterSection, "links">>({
    defaultValues: {
      brandName: footer.brandName,
      brandHighlight: footer.brandHighlight,
      tagline: footer.tagline,
      copyright: footer.copyright,
    },
  });

  const onSubmit = async (data: Omit<FooterSection, "links">) => {
    setIsLoading(true);
    try {
      const result = await updateLandingPageContent({
        footer: { ...data, links },
      });
      if (result.success) {
        toast.success("Footer updated successfully");
      } else {
        toast.error(result.error || "Failed to update");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const addLink = (category: LinkCategory) => {
    setLinks({
      ...links,
      [category]: [...links[category], { label: "New Link", href: "#" }],
    });
  };

  const removeLink = (category: LinkCategory, index: number) => {
    setLinks({
      ...links,
      [category]: links[category].filter((_, i) => i !== index),
    });
  };

  const updateLink = (
    category: LinkCategory,
    index: number,
    updates: Partial<LinkItem>,
  ) => {
    setLinks({
      ...links,
      [category]: links[category].map((link, i) =>
        i === index ? { ...link, ...updates } : link,
      ),
    });
  };

  const LinkEditor = ({
    category,
    title,
  }: {
    category: LinkCategory;
    title: string;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{title}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => addLink(category)}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {links[category].map((link, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={link.label}
            onChange={(e) =>
              updateLink(category, index, { label: e.target.value })
            }
            placeholder="Label"
            className="flex-1 h-10 bg-background/80 border-input/50 focus:border-primary transition-colors"
          />
          <Input
            value={link.href}
            onChange={(e) =>
              updateLink(category, index, { href: e.target.value })
            }
            placeholder="URL"
            className="flex-1 h-10 bg-background/80 border-input/50 focus:border-primary transition-colors"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeLink(category, index)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <Card className="overflow-hidden border-0 p-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
            <Layout className="h-5 w-5 text-cyan-500" />
          </div>
          <div>
            <CardTitle className="text-xl">Footer Section</CardTitle>
            <CardDescription className="mt-1">
              Customize the footer branding and navigation links
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Branding
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandName" className="text-sm font-medium">
                    Brand Name
                  </Label>
                  <Input
                    id="brandName"
                    {...form.register("brandName")}
                    placeholder="Support"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="brandHighlight"
                    className="text-sm font-medium"
                  >
                    Brand Highlight
                  </Label>
                  <Input
                    id="brandHighlight"
                    {...form.register("brandHighlight")}
                    placeholder="Hub"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <Label htmlFor="tagline" className="text-sm font-medium">
                  Tagline
                </Label>
                <Textarea
                  id="tagline"
                  {...form.register("tagline")}
                  placeholder="Your trusted partner..."
                  rows={2}
                  className="bg-background/80 border-input/50 focus:border-primary transition-colors resize-none"
                />
              </div>
              <div className="mt-5 space-y-2">
                <Label htmlFor="copyright" className="text-sm font-medium">
                  Copyright
                </Label>
                <Input
                  id="copyright"
                  {...form.register("copyright")}
                  placeholder="© 2024 SupportHub. All rights reserved."
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Links Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Navigation Links
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="grid gap-6 sm:grid-cols-2">
                <LinkEditor category="product" title="Product" />
                <LinkEditor category="resources" title="Resources" />
                <LinkEditor category="company" title="Company" />
                <LinkEditor category="legal" title="Legal" />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end py-6">
            <Button
              type="submit"
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
        </form>
      </CardContent>
    </Card>
  );
}
