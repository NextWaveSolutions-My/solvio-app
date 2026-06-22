"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { regenerateAIEmbeddings } from "@/actions/ai-training";

export function RegenerateButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const result = await regenerateAIEmbeddings();
      if (result.success && result.data) {
        if (result.data.regenerated === 0 && result.data.failed === 0) {
          toast.success("All pairs already have embeddings");
        } else {
          toast.success(
            `Regenerated ${result.data.regenerated}` +
              (result.data.failed ? `, ${result.data.failed} failed` : "")
          );
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to regenerate");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : (
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
      )}
      Regenerate
    </Button>
  );
}
