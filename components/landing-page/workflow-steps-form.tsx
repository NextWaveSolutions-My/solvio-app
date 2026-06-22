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
  Workflow,
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
import { WorkflowStep } from "@/types/landing-page";
import { updateLandingPageContent } from "@/actions/landing-page";
import { LANDING_ICON_OPTIONS } from "@/components/landing-page/config";

interface WorkflowStepsFormProps {
  workflowSteps: WorkflowStep[];
}

export function WorkflowStepsForm({
  workflowSteps: initialWorkflowSteps,
}: WorkflowStepsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [workflowSteps, setWorkflowSteps] =
    useState<WorkflowStep[]>(initialWorkflowSteps);

  const addWorkflowStep = () => {
    setWorkflowSteps((current) => [
      ...current,
      {
        id: Date.now().toString(),
        icon: "CheckCircle",
        title: "New workflow step",
        description: "Explain what happens at this stage of the support journey.",
        enabled: true,
        order: current.length + 1,
      },
    ]);
  };

  const updateWorkflowStep = (id: string, updates: Partial<WorkflowStep>) => {
    setWorkflowSteps((current) =>
      current.map((step) => (step.id === id ? { ...step, ...updates } : step)),
    );
  };

  const removeWorkflowStep = (id: string) => {
    setWorkflowSteps((current) => current.filter((step) => step.id !== id));
  };

  const toggleEnabled = (id: string) => {
    setWorkflowSteps((current) =>
      current.map((step) =>
        step.id === id ? { ...step, enabled: !step.enabled } : step,
      ),
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateLandingPageContent({ workflowSteps });
      if (result.success) {
        toast.success("Workflow steps updated successfully");
      } else {
        toast.error(result.error || "Failed to update workflow steps");
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Workflow className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Workflow Steps</CardTitle>
              <CardDescription className="mt-1">
                Show customers how support moves from request to resolution.
              </CardDescription>
            </div>
          </div>
          <Button onClick={addWorkflowStep} variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Step
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {workflowSteps.map((step, index) => (
          <div
            key={step.id}
            className={`rounded-xl border bg-muted/20 p-5 space-y-4 transition-all hover:bg-muted/30 ${
              !step.enabled ? "opacity-60 bg-muted/50" : ""
            }`}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">
                Step #{index + 1}
              </span>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleEnabled(step.id)}
                className="h-8 w-8 p-0"
              >
                {step.enabled ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeWorkflowStep(step.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Icon</Label>
                <select
                  value={step.icon}
                  onChange={(e) =>
                    updateWorkflowStep(step.id, { icon: e.target.value })
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
                  value={step.title}
                  onChange={(e) =>
                    updateWorkflowStep(step.id, { title: e.target.value })
                  }
                  className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Description</Label>
              <Input
                value={step.description}
                onChange={(e) =>
                  updateWorkflowStep(step.id, { description: e.target.value })
                }
                className="h-11 bg-background/80 border-input/50 focus:border-primary transition-colors"
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
                Save Workflow
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
