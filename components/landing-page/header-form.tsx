"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, PanelTop } from "lucide-react";
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
import { HeaderSection } from "@/types/landing-page";
import { updateLandingPageContent } from "@/actions/landing-page";

interface HeaderFormProps {
  header: HeaderSection;
}

type NavLink = { label: string; href: string };

export function HeaderForm({ header }: HeaderFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [navLinks, setNavLinks] = useState<NavLink[]>(
    header.navigationLinks
  );

  const form = useForm<Omit<HeaderSection, "navigationLinks">>({
    defaultValues: {
      signInText: header.signInText,
      ctaButtonText: header.ctaButtonText,
      ctaButtonLink: header.ctaButtonLink,
      mobileCtaText: header.mobileCtaText,
    },
  });

  const onSubmit = async (data: Omit<HeaderSection, "navigationLinks">) => {
    setIsLoading(true);
    try {
      const result = await updateLandingPageContent({
        header: { ...data, navigationLinks: navLinks },
      });
      if (result.success) {
        toast.success("Header updated successfully");
      } else {
        toast.error(result.error || "Failed to update");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const addLink = () => {
    setNavLinks([...navLinks, { label: "New Link", href: "#" }]);
  };

  const removeLink = (index: number) => {
    setNavLinks(navLinks.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, updates: Partial<NavLink>) => {
    setNavLinks(
      navLinks.map((link, i) =>
        i === index ? { ...link, ...updates } : link
      )
    );
  };

  return (
    <Card className="overflow-hidden border-0 p-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader className="border-b p-6 gap-0 bg-muted/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
            <PanelTop className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <CardTitle className="text-xl">Header Section</CardTitle>
            <CardDescription className="mt-1">
              Customize the navigation links and buttons in your landing page
              header
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Navigation Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Navigation Links
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5 space-y-3">
              {navLinks.map((link, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={link.label}
                    onChange={(e) =>
                      updateLink(index, { label: e.target.value })
                    }
                    placeholder="Label"
                    className="flex-1 h-10 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <Input
                    value={link.href}
                    onChange={(e) =>
                      updateLink(index, { href: e.target.value })
                    }
                    placeholder="URL (e.g. / or /#services)"
                    className="flex-1 h-10 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLink(index)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLink}
                className="mt-2"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Link
              </Button>
            </div>
          </div>

          {/* Button Configuration */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Buttons
            </h3>
            <div className="rounded-xl border bg-muted/20 p-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="signInText" className="text-sm font-medium">
                    Sign In Button Text
                  </Label>
                  <Input
                    id="signInText"
                    {...form.register("signInText")}
                    placeholder="Sign In"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="ctaButtonText"
                    className="text-sm font-medium"
                  >
                    CTA Button Text
                  </Label>
                  <Input
                    id="ctaButtonText"
                    {...form.register("ctaButtonText")}
                    placeholder="Create Ticket"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Shown for unauthenticated users and as the primary action
                    button
                  </p>
                </div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 mt-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="ctaButtonLink"
                    className="text-sm font-medium"
                  >
                    CTA Button Link
                  </Label>
                  <Input
                    id="ctaButtonLink"
                    {...form.register("ctaButtonLink")}
                    placeholder="/dashboard/tickets/new"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="mobileCtaText"
                    className="text-sm font-medium"
                  >
                    Mobile CTA Text
                  </Label>
                  <Input
                    id="mobileCtaText"
                    {...form.register("mobileCtaText")}
                    placeholder="Get Started"
                    className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    CTA text shown on mobile for unauthenticated users
                  </p>
                </div>
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
