"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { FAQItem } from "@/types/landing-page";
import { Plus } from "lucide-react";

interface FAQAccordionProps {
  items: FAQItem[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="mx-auto mt-12 max-w-3xl space-y-3">
      {items.map((item) => {
        const isOpen = openId === item.id;

        return (
          <Collapsible
            key={item.id}
            open={isOpen}
            onOpenChange={(nextOpen) => setOpenId(nextOpen ? item.id : null)}
          >
            <div
              className={cn(
                "rounded-2xl border bg-card px-5 transition-colors sm:px-6",
                isOpen
                  ? "border-primary/30 shadow-sm shadow-primary/5"
                  : "border-border/60 hover:border-border",
              )}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 py-5 text-left">
                <span className="text-[15px] font-semibold text-foreground">
                  {item.question}
                </span>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                    isOpen
                      ? "rotate-45 border-primary/30 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/50 text-muted-foreground",
                  )}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </CollapsibleTrigger>

              <CollapsibleContent
                className={cn(
                  "overflow-hidden transition-all",
                  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
                  "data-[state=open]:animate-in data-[state=open]:fade-in-0",
                )}
              >
                <div className="pb-5 pr-8 text-[14px] leading-relaxed text-muted-foreground">
                  {item.answer}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
