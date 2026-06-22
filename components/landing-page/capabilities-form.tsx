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
  Grid3X3,
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
import { Capability } from "@/types/landing-page";
import { updateLandingPageContent } from "@/actions/landing-page";
import { LANDING_ICON_OPTIONS } from "@/components/landing-page/config";

interface CapabilitiesFormProps {
  capabilities: Capability[];
}

export function CapabilitiesForm({
  capabilities: initialCapabilities,
}: CapabilitiesFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [capabilities, setCapabilities] =
    useState<Capability[]>(initialCapabilities);

  const addCapability = () => {
    setCapabilities((current) => [
      ...current,
      {
        id: Date.now().toString(),
        icon: "Sparkles",
        title: "New capability",
        description: "Describe the product capability or workflow benefit.",
        badge: "Short proof point",
        link: "/dashboard",
        enabled: true,
        order: current.length + 1,
      },
    ]);
  };

  const updateCapability = (id: string, updates: Partial<Capability>) => {
    setCapabilities((current) =>
      current.map((capability) =>
        capability.id === id ? { ...capability, ...updates } : capability,
      ),
    );
  };

  const removeCapability = (id: string) => {
    setCapabilities((current) =>
      current.filter((capability) => capability.id !== id),
    );
  };

  const toggleEnabled = (id: string) => {
    setCapabilities((current) =>
      current.map((capability) =>
        capability.id === id
          ? { ...capability, enabled: !capability.enabled }
          : capability,
      ),
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateLandingPageContent({ capabilities });
      if (result.success) {
        toast.success("Capabilities updated successfully");
      } else {
        toast.error(result.error || "Failed to update capabilities");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
              <Grid3X3 className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Features & Capabilities</CardTitle>
              <CardDescription className="mt-1">
                Manage the platform features shown in the core capabilities section.
              </CardDescription>
            </div>
          </div>
          <Button onClick={addCapability} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Feature
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {capabilities.map((capability, index) => (
          <div
            key={capability.id}
            className={`rounded-xl border bg-muted/20 p-5 space-y-4 transition-all hover:bg-muted/30 ${
              !capability.enabled ? "opacity-60 bg-muted/50" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Feature #{index + 1}
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleEnabled(capability.id)}
                className="h-8 w-8 p-0"
              >
                {capability.enabled ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeCapability(capability.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Icon</Label>
                <select
                  value={capability.icon}
                  onChange={(e) =>
                    updateCapability(capability.id, { icon: e.target.value })
                  }
                  className="w-full h-11 px-3 rounded-lg border border-input/50 bg-background/80 focus:border-primary transition-colors"
                >
                  {LANDING_ICON_OPTIONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Title</Label>
                <Input
                  value={capability.title}
                  onChange={(e) =>
                    updateCapability(capability.id, { title: e.target.value })
                  }
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Input
                value={capability.description}
                onChange={(e) =>
                  updateCapability(capability.id, {
                    description: e.target.value,
                  })
                }
                className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Badge</Label>
                <Input
                  value={capability.badge}
                  onChange={(e) =>
                    updateCapability(capability.id, { badge: e.target.value })
                  }
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Link</Label>
                <Input
                  value={capability.link}
                  onChange={(e) =>
                    updateCapability(capability.id, { link: e.target.value })
                  }
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
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
                Save Features
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
