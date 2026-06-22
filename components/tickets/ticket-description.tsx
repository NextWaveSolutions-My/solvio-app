"use client";

import { useState } from "react";
import { Check, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TicketDescriptionProps {
  description: string;
  className?: string;
}

export function TicketDescription({
  description,
  className,
}: TicketDescriptionProps) {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Detect if content looks like code/error (contains common patterns)
  const looksLikeCode =
    description.includes("Error:") ||
    description.includes("at ") ||
    description.includes("(") ||
    description.includes("{") ||
    description.includes("=>") ||
    description.includes("//") ||
    description.includes("/*") ||
    /^\s{2,}/m.test(description); // Has indentation

  // Check if content is long (more than 15 lines)
  const lines = description.split("\n");
  const isLong = lines.length > 15;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(description);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Highlight error patterns
  const highlightErrors = (text: string) => {
    const errorPatterns = [
      { pattern: /(Error:|error:)/gi, className: "text-destructive font-semibold" },
      { pattern: /(Warning:|warning:)/gi, className: "text-warning font-semibold" },
      { pattern: /(at\s+[\w.<>]+)/g, className: "text-muted-foreground" },
      { pattern: /(\(.*?:\d+:\d+\))/g, className: "text-info" },
      { pattern: /(https?:\/\/[^\s]+)/g, className: "text-primary underline" },
    ];

    let result = text;
    let parts: Array<{ text: string; className?: string }> = [{ text: result }];

    errorPatterns.forEach(({ pattern, className }) => {
      const newParts: Array<{ text: string; className?: string }> = [];
      
      parts.forEach((part) => {
        if (part.className) {
          newParts.push(part);
          return;
        }

        const matches = [...part.text.matchAll(pattern)];
        if (matches.length === 0) {
          newParts.push(part);
          return;
        }

        let lastIndex = 0;
        matches.forEach((match) => {
          const matchIndex = match.index!;
          if (matchIndex > lastIndex) {
            newParts.push({ text: part.text.slice(lastIndex, matchIndex) });
          }
          newParts.push({ text: match[0], className });
          lastIndex = matchIndex + match[0].length;
        });

        if (lastIndex < part.text.length) {
          newParts.push({ text: part.text.slice(lastIndex) });
        }
      });

      parts = newParts;
    });

    return parts;
  };

  const displayedContent = isLong && !isExpanded 
    ? lines.slice(0, 15).join("\n") + "\n..." 
    : description;

  return (
    <div className={cn("relative group", className)}>
      {/* Copy Button */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={handleCopy}
          className="h-7 w-7 bg-background/95 backdrop-blur-sm"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Content */}
      <div
        className={cn(
          "rounded-md border border-border bg-card p-4 pr-12 min-h-30",
          isLong && !isExpanded && "max-h-[400px]",
          "overflow-auto"
        )}
      >
        {looksLikeCode ? (
          <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
            {highlightErrors(displayedContent).map((part, index) => (
              <span key={index} className={part.className}>
                {part.text}
              </span>
            ))}
          </pre>
        ) : (
          <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground">
            {displayedContent}
          </p>
        )}
      </div>

      {/* Expand/Collapse Button */}
      {isLong && (
        <div className="flex justify-center mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1 text-xs"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Show More ({lines.length - 15} more lines)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

