"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ComboboxOption {
  /** Stored/selected value. */
  value: string;
  /** Text shown in the list and trigger. */
  label: string;
  /** Optional supporting text shown under the label. */
  description?: string;
  /** Optional leading visual, such as an icon or avatar. */
  icon?: React.ReactNode;
  /** Extra terms used for searching (e.g. country codes, abbreviations). */
  keywords?: string[];
  disabled?: boolean;
}

export interface ComboboxGroup {
  heading?: string;
  options: ComboboxOption[];
}

export interface ComboboxProps {
  /** Flat list of options. Use either `options` or `groups`. */
  options?: ComboboxOption[];
  /** Grouped options with optional headings. */
  groups?: ComboboxGroup[];
  value?: string;
  onValueChange: (value: string) => void;
  /** Trigger text when nothing is selected. */
  placeholder?: string;
  /** Search input placeholder. */
  searchPlaceholder?: string;
  /** Shown when the search has no matches. */
  emptyMessage?: string;
  disabled?: boolean;
  /** Allow re-selecting the current value to clear it. */
  clearable?: boolean;
  /** Forwarded to the trigger for `<label htmlFor>` association. */
  id?: string;
  /** Classes for the trigger button. */
  className?: string;
  /** Classes for the popover content. */
  contentClassName?: string;
  /** Classes for the scrollable option list. */
  listClassName?: string;
  /** Render popover content in a portal. */
  portalled?: boolean;
  /** Keep focus/scroll handling inside the popover. Useful inside dialogs. */
  modal?: boolean;
  /** Custom selected value renderer for the trigger. */
  renderValue?: (option: ComboboxOption) => React.ReactNode;
  /** Custom option renderer for the dropdown rows. */
  renderOption?: (option: ComboboxOption) => React.ReactNode;
  "aria-invalid"?: boolean | "true" | "false";
}

const TRIGGER_CLASSES =
  "border-input data-[placeholder=true]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

function getOptionSearchValue(option: ComboboxOption) {
  return [option.label, option.value, ...(option.keywords ?? [])].join(" ");
}

export function Combobox({
  options,
  groups,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled,
  clearable = false,
  id,
  className,
  contentClassName,
  listClassName,
  portalled = true,
  modal = false,
  renderValue,
  renderOption,
  "aria-invalid": ariaInvalid,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();

  const resolvedGroups: ComboboxGroup[] = React.useMemo(
    () => groups ?? [{ options: options ?? [] }],
    [groups, options],
  );

  const selectedOption = React.useMemo(() => {
    for (const group of resolvedGroups) {
      const match = group.options.find((o) => o.value === value);
      if (match) return match;
    }
    return undefined;
  }, [resolvedGroups, value]);

  const handleSelect = (option: ComboboxOption) => {
    if (clearable && option.value === value) {
      onValueChange("");
    } else {
      onValueChange(option.value);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          data-placeholder={!selectedOption}
          className={cn(TRIGGER_CLASSES, className)}
        >
          <span className="line-clamp-1 text-left">
            {selectedOption
              ? renderValue?.(selectedOption) ?? selectedOption.label
              : placeholder}
          </span>
          <ChevronsUpDownIcon className="size-4 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        portalled={portalled}
        className={cn(
          "w-(--radix-popover-trigger-width) overflow-hidden rounded-md p-0 shadow-md",
          contentClassName,
        )}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList
            id={listId}
            className={cn("max-h-[300px]", listClassName)}
          >
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {resolvedGroups.map((group, index) => (
              <CommandGroup
                key={`${group.heading ?? "group"}-${index}`}
                heading={group.heading}
              >
                {group.options.map((option) => (
                  <CommandItem
                    key={`${group.heading ?? index}-${option.value}`}
                    value={getOptionSearchValue(option)}
                    keywords={option.keywords}
                    disabled={option.disabled}
                    className="min-h-9 rounded-md px-2.5 py-2"
                    onSelect={() => handleSelect(option)}
                  >
                    <CheckIcon
                      className={cn(
                        "size-4",
                        option.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.icon}
                    {renderOption ? (
                      renderOption(option)
                    ) : (
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{option.label}</span>
                        {option.description && (
                          <span className="truncate text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        )}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type SearchableSelectProps = ComboboxProps;
export { Combobox as SearchableSelect };
