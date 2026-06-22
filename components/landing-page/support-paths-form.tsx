"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, Eye, EyeOff, Zap } from "lucide-react";
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
import { SupportPath } from "@/types/landing-page";
import { updateLandingPageContent } from "@/actions/landing-page";
import {
  LANDING_COLOR_OPTIONS,
  LANDING_ICON_OPTIONS,
} from "@/components/landing-page/config";

interface SupportPathsFormProps {
  supportPaths: SupportPath[];
}

export function SupportPathsForm({
  supportPaths: initialSupportPaths,
}: SupportPathsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [supportPaths, setSupportPaths] =
    useState<SupportPath[]>(initialSupportPaths);

  const addSupportPath = () => {
    setSupportPaths((current) => [
      ...current,
      {
        id: Date.now().toString(),
        icon: "HelpCircle",
        title: "New Support Path",
        description: "Explain when this support option should be used.",
        badge: "Helpful context",
        link: "/dashboard/tickets/new",
        colorClass: LANDING_COLOR_OPTIONS[0].value,
        enabled: true,
        order: current.length + 1,
      },
    ]);
  };

  const updateSupportPath = (id: string, updates: Partial<SupportPath>) => {
    setSupportPaths((current) =>
      current.map((path) => (path.id === id ? { ...path, ...updates } : path)),
    );
  };

  const removeSupportPath = (id: string) => {
    setSupportPaths((current) => current.filter((path) => path.id !== id));
  };

  const toggleEnabled = (id: string) => {
    setSupportPaths((current) =>
      current.map((path) =>
        path.id === id ? { ...path, enabled: !path.enabled } : path,
      ),
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateLandingPageContent({ supportPaths });
      if (result.success) {
        toast.success("Support paths updated successfully");
      } else {
        toast.error(result.error || "Failed to update support paths");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10">
              <Zap className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Support Paths</CardTitle>
              <CardDescription className="mt-1">
                Manage the action cards that guide customers to the right type of help.
              </CardDescription>
            </div>
          </div>
          <Button onClick={addSupportPath} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Path
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {supportPaths.map((path, index) => (
          <div
            key={path.id}
            className={`rounded-xl border bg-muted/20 p-5 space-y-4 transition-all hover:bg-muted/30 ${
              !path.enabled ? "opacity-60 bg-muted/50" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                #{index + 1}
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleEnabled(path.id)}
                className="h-8 w-8 p-0"
              >
                {path.enabled ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSupportPath(path.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Icon</Label>
                <select
                  value={path.icon}
                  onChange={(e) =>
                    updateSupportPath(path.id, { icon: e.target.value })
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
                  value={path.title}
                  onChange={(e) =>
                    updateSupportPath(path.id, { title: e.target.value })
                  }
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Color</Label>
                <select
                  value={path.colorClass}
                  onChange={(e) =>
                    updateSupportPath(path.id, { colorClass: e.target.value })
                  }
                  className="w-full h-11 px-3 rounded-lg border border-input/50 bg-background/80 focus:border-primary transition-colors"
                >
                  {LANDING_COLOR_OPTIONS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Input
                value={path.description}
                onChange={(e) =>
                  updateSupportPath(path.id, { description: e.target.value })
                }
                className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Badge</Label>
                <Input
                  value={path.badge}
                  onChange={(e) =>
                    updateSupportPath(path.id, { badge: e.target.value })
                  }
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Link</Label>
                <Input
                  value={path.link}
                  onChange={(e) =>
                    updateSupportPath(path.id, { link: e.target.value })
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
                Save Support Paths
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
