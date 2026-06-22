"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function OfflineRetryButton() {
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = () => {
    setIsReloading(true);
    window.location.reload();
  };

  return (
    <Button
      type="button"
      onClick={handleReload}
      disabled={isReloading}
      className="h-11 min-w-32 rounded-xl px-7 text-base font-semibold"
    >
      {isReloading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Reloading...
        </>
      ) : (
        "Try Again"
      )}
    </Button>
  );
}
