"use client";

import { Label } from "@/components/ui/label";
import type { AISitePublic } from "@/types";

interface SiteSelectProps {
  id?: string;
  /** Site id, or "" for Global. */
  value: string;
  onChange: (value: string) => void;
  sites: AISitePublic[];
  disabled?: boolean;
  /** Hide the helper text (e.g. in tight layouts). */
  hideHint?: boolean;
}

/**
 * Assigns a knowledge source to a site (or Global). Native <select> so it works
 * cleanly inside dialogs without portal/z-index quirks. Empty value ⇒ Global.
 */
export function SiteSelect({
  id = "site-select",
  value,
  onChange,
  sites,
  disabled,
  hideHint,
}: SiteSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Site</Label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Global — answers on every site</option>
        {sites.map((s) => (
          <option key={s._id} value={s._id}>
            {s.name}
            {s.enabled ? "" : " (disabled)"}
          </option>
        ))}
      </select>
      {!hideHint && (
        <p className="text-xs text-muted-foreground">
          Scope this source to one site, or leave Global so it answers on every
          embedded site.
        </p>
      )}
    </div>
  );
}
