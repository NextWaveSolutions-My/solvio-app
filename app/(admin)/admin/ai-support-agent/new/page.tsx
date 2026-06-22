import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingPairForm } from "@/components/ai-training/training-pair-form";
import { listSites } from "@/actions/ai-sites";

export const dynamic = "force-dynamic";

export default async function NewAITrainingPairPage() {
  const sitesResult = await listSites();
  const sites = sitesResult.data ?? [];
  return (
    <div className="max-w-2xl space-y-6 pb-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/admin/ai-support-agent">
            <ChevronLeft className="h-4 w-4" />
            Back to AI Support Agent
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          New Training Pair
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add a question and the approved answer. An embedding will be generated
          automatically.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Q&amp;A Pair</CardTitle>
          <CardDescription>
            Keep questions phrased how a real customer would ask them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingPairForm sites={sites} />
        </CardContent>
      </Card>
    </div>
  );
}
