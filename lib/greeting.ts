/**
 * Returns a time-of-day greeting ("Good morning" / "Good afternoon" /
 * "Good evening") for the given date. Defaults to the current time.
 */
export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Extracts the first name from a full name, e.g. "James Smith" -> "James". */
export function getFirstName(name?: string | null): string | undefined {
  const first = name?.trim().split(/\s+/)[0];
  return first || undefined;
}
