"use client";

import {
  Combobox,
  type ComboboxGroup,
  type ComboboxProps,
} from "@/components/ui/combobox";
import { COUNTRIES } from "@/lib/constants/countries";

const COUNTRY_GROUPS: ComboboxGroup[] = [...COUNTRIES]
  .sort((a, b) => a.name.localeCompare(b.name))
  .reduce<ComboboxGroup[]>((groups, country) => {
    const heading = country.name[0]?.toUpperCase() || "#";
    const currentGroup = groups[groups.length - 1];

    if (!currentGroup || currentGroup.heading !== heading) {
      groups.push({ heading, options: [] });
    }

    groups[groups.length - 1].options.push({
      value: country.name,
      label: country.name,
      keywords: [country.code],
    });

    return groups;
  }, []);

export type CountryComboboxProps = Omit<
  ComboboxProps,
  "emptyMessage" | "groups" | "options" | "searchPlaceholder"
> & {
  emptyMessage?: string;
  searchPlaceholder?: string;
};

export function CountryCombobox({
  placeholder = "Select country",
  searchPlaceholder = "Search countries...",
  emptyMessage = "No country found.",
  portalled = true,
  ...props
}: CountryComboboxProps) {
  return (
    <Combobox
      groups={COUNTRY_GROUPS}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      portalled={portalled}
      {...props}
    />
  );
}
