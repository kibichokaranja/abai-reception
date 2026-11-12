/** Kenya local calendar date for visit stamps and guest display. */
export const VISIT_TIMEZONE = "Africa/Nairobi";

/** Today's date in Africa/Nairobi as YYYY-MM-DD (ISO date). */
export function todayVisitDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VISIT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Human-readable visit date for guest form / staff UI (e.g. 12 Nov 2026). */
export function formatVisitDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Noon UTC avoids DST edge cases when formatting a calendar date.
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  try {
    return new Intl.DateTimeFormat("en-KE", {
      timeZone: VISIT_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return isoDate;
  }
}
