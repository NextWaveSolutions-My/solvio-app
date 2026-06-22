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
  BadgeCheck,
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
import { ProofSection, ProofStat, Partner, Testimonial } from "@/types/landing-page";
import { updateLandingPageContent } from "@/actions/landing-page";

interface ProofFormProps {
  proof: ProofSection;
}

export function ProofForm({ proof }: ProofFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [values, setValues] = useState(proof);

  const updateStat = (id: string, updates: Partial<ProofStat>) => {
    setValues((current) => ({
      ...current,
      stats: current.stats.map((stat) =>
        stat.id === id ? { ...stat, ...updates } : stat,
      ),
    }));
  };

  const addStat = () => {
    setValues((current) => ({
      ...current,
      stats: [
        ...current.stats,
        {
          id: Date.now().toString(),
          value: "New stat",
          label: "What this proves",
        },
      ],
    }));
  };

  const removeStat = (id: string) => {
    setValues((current) => ({
      ...current,
      stats: current.stats.filter((stat) => stat.id !== id),
    }));
  };

  const updatePartner = (id: string, updates: Partial<Partner>) => {
    setValues((current) => ({
      ...current,
      partners: current.partners.map((partner) =>
        partner.id === id ? { ...partner, ...updates } : partner,
      ),
    }));
  };

  const addPartner = () => {
    setValues((current) => ({
      ...current,
      partners: [
        ...current.partners,
        {
          id: Date.now().toString(),
          name: "new-partner",
          displayName: "New Partner",
          enabled: true,
          order: current.partners.length + 1,
        },
      ],
    }));
  };

  const removePartner = (id: string) => {
    setValues((current) => ({
      ...current,
      partners: current.partners.filter((partner) => partner.id !== id),
    }));
  };

  const togglePartner = (id: string) => {
    setValues((current) => ({
      ...current,
      partners: current.partners.map((partner) =>
        partner.id === id ? { ...partner, enabled: !partner.enabled } : partner,
      ),
    }));
  };

  const updateTestimonial = (id: string, updates: Partial<Testimonial>) => {
    setValues((current) => ({
      ...current,
      testimonials: current.testimonials.map((testimonial) =>
        testimonial.id === id ? { ...testimonial, ...updates } : testimonial,
      ),
    }));
  };

  const addTestimonial = () => {
    setValues((current) => ({
      ...current,
      testimonials: [
        ...current.testimonials,
        {
          id: Date.now().toString(),
          name: "New Customer",
          role: "Customer",
          initials: "NC",
          text: "Add a support outcome or success story here.",
          rating: 5,
          enabled: true,
          order: current.testimonials.length + 1,
        },
      ],
    }));
  };

  const removeTestimonial = (id: string) => {
    setValues((current) => ({
      ...current,
      testimonials: current.testimonials.filter(
        (testimonial) => testimonial.id !== id,
      ),
    }));
  };

  const toggleTestimonial = (id: string) => {
    setValues((current) => ({
      ...current,
      testimonials: current.testimonials.map((testimonial) =>
        testimonial.id === id
          ? { ...testimonial, enabled: !testimonial.enabled }
          : testimonial,
      ),
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateLandingPageContent({ proof: values });
      if (result.success) {
        toast.success("Proof section updated successfully");
      } else {
        toast.error(result.error || "Failed to update proof section");
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <BadgeCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-xl">Proof & Trust</CardTitle>
            <CardDescription className="mt-1">
              Edit the section that combines proof stats, logos, and testimonials.
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
          <div className="space-y-2">
            <Label className="text-sm font-medium">Trust Statement</Label>
            <Textarea
              value={values.trustStatement}
              onChange={(e) =>
                setValues((current) => ({
                  ...current,
                  trustStatement: e.target.value,
                }))
              }
              rows={2}
              className="bg-background/80 border-input/50 focus:border-primary transition-colors resize-none"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Proof Stats</h3>
            <Button onClick={addStat} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Stat
            </Button>
          </div>
          {values.stats.map((stat, index) => (
            <div key={stat.id} className="rounded-xl border bg-background/70 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Stat #{index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeStat(stat.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  value={stat.value}
                  onChange={(e) => updateStat(stat.id, { value: e.target.value })}
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
                <Input
                  value={stat.label}
                  onChange={(e) => updateStat(stat.id, { label: e.target.value })}
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Partner Logos</h3>
            <Button onClick={addPartner} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Logo
            </Button>
          </div>
          {values.partners.map((partner, index) => (
            <div
              key={partner.id}
              className={`rounded-xl border bg-background/70 p-4 ${
                !partner.enabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Logo #{index + 1}
                </span>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePartner(partner.id)}
                  className="h-8 w-8 p-0"
                >
                  {partner.enabled ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePartner(partner.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  value={partner.name}
                  onChange={(e) =>
                    updatePartner(partner.id, { name: e.target.value })
                  }
                  placeholder="Partner ID"
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
                <Input
                  value={partner.displayName}
                  onChange={(e) =>
                    updatePartner(partner.id, { displayName: e.target.value })
                  }
                  placeholder="Display name"
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-muted/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Testimonials</h3>
            <Button
              onClick={addTestimonial}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Testimonial
            </Button>
          </div>
          {values.testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={`rounded-xl border bg-background/70 p-4 space-y-4 ${
                !testimonial.enabled ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Testimonial #{index + 1}
                </span>
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleTestimonial(testimonial.id)}
                  className="h-8 w-8 p-0"
                >
                  {testimonial.enabled ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTestimonial(testimonial.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <Input
                  value={testimonial.name}
                  onChange={(e) =>
                    updateTestimonial(testimonial.id, { name: e.target.value })
                  }
                  placeholder="Name"
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
                <Input
                  value={testimonial.role}
                  onChange={(e) =>
                    updateTestimonial(testimonial.id, { role: e.target.value })
                  }
                  placeholder="Role"
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
                <Input
                  value={testimonial.initials}
                  onChange={(e) =>
                    updateTestimonial(testimonial.id, {
                      initials: e.target.value,
                    })
                  }
                  placeholder="Initials"
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={testimonial.rating}
                  onChange={(e) =>
                    updateTestimonial(testimonial.id, {
                      rating: parseInt(e.target.value, 10) || 5,
                    })
                  }
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
              <Textarea
                value={testimonial.text}
                onChange={(e) =>
                  updateTestimonial(testimonial.id, { text: e.target.value })
                }
                rows={3}
                className="bg-background/80 border-input/50 focus:border-primary transition-colors resize-none"
              />
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
                Save Proof Section
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
