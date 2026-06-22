"use client";

import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { TIMEZONES } from "@/components/ui/timezones";

// Re-exported for existing client-component consumers.
export { TIMEZONES };

const TIMEZONE_OPTIONS: ComboboxOption[] = TIMEZONES.map((tz) => ({
  value: tz.value,
  label: tz.label,
  // Allow searching by IANA name parts (e.g. "Kolkata", "Asia") and offset.
  keywords: tz.value.split("/"),
}));

interface TimezoneSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

export function TimezoneSelect({
  value,
  onValueChange,
  disabled,
  placeholder = "Select timezone",
  searchPlaceholder = "Search timezones...",
  emptyMessage = "No timezone found.",
  id,
  className,
  "aria-invalid": ariaInvalid,
}: TimezoneSelectProps) {
  return (
    <Combobox
      options={TIMEZONE_OPTIONS}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      id={id}
      className={className}
      aria-invalid={ariaInvalid}
    />
  );
}
