/**
 * Semester calendar. Week 1 starts on the semester's week1Monday; dates are calendar dates
 * (time of day ignored). The course runs on Malaysia time (UTC+8).
 */
export const APP_TIME_ZONE = "Asia/Kuching";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Days since the Unix epoch for the calendar date of `d` (UTC fields). */
function epochDay(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / DAY_MS);
}

/** Calendar date (as a UTC-midnight Date) of an instant, in the app time zone. */
export function localDate(instant: Date, timeZone: string = APP_TIME_ZONE): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

/** Semester week (1-based) containing `date`. Dates before week 1 give 0 or negative numbers. */
export function weekOf(date: Date, week1Monday: Date): number {
  return Math.floor((epochDay(date) - epochDay(week1Monday)) / 7) + 1;
}

/** Monday (UTC-midnight Date) of semester week `week`. */
export function weekStart(week: number, week1Monday: Date): Date {
  return new Date((epochDay(week1Monday) + (week - 1) * 7) * DAY_MS);
}

/** Sunday (UTC-midnight Date) of semester week `week`. */
export function weekEnd(week: number, week1Monday: Date): Date {
  return new Date((epochDay(week1Monday) + (week - 1) * 7 + 6) * DAY_MS);
}

/** Parse "YYYY-MM-DD" into a UTC-midnight Date, or null if invalid. */
export function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
    ? d
    : null;
}

export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isMonday(d: Date): boolean {
  return d.getUTCDay() === 1;
}

/** An instant given as a local date and time in UTC+8 (the course has no daylight saving). */
export function myTime(date: Date, hours: number, minutes: number): Date {
  return new Date(date.getTime() + (hours - 8) * 60 * 60 * 1000 + minutes * 60 * 1000);
}
