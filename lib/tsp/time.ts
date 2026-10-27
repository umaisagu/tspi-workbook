/**
 * LOGT time arithmetic (workbook LOGT: "Delta = Stop − Start − Int", all in minutes).
 * Times are minutes after midnight on the entry's date; a session that runs past midnight
 * is recorded as two entries.
 */

/** "HH:MM" (24-hour) → minutes after midnight, or null. */
export function parseClock(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Minutes after midnight → "HH:MM". */
export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface TimeEntryInput {
  startMin: number;
  stopMin: number;
  interruptMin: number;
}

/** Field → message for an invalid entry; empty when valid. */
export function timeEntryErrors(e: TimeEntryInput): Partial<Record<"start" | "stop" | "interruptMin", string>> {
  const errors: Partial<Record<"start" | "stop" | "interruptMin", string>> = {};
  if (!Number.isInteger(e.startMin) || e.startMin < 0 || e.startMin > 1439) errors.start = "Enter a start time";
  if (!Number.isInteger(e.stopMin) || e.stopMin < 0 || e.stopMin > 1439) errors.stop = "Enter a stop time";
  if (errors.start || errors.stop) return errors;
  if (e.stopMin <= e.startMin) {
    errors.stop = "Stop must be after start (split sessions that pass midnight)";
    return errors;
  }
  if (!Number.isInteger(e.interruptMin) || e.interruptMin < 0) errors.interruptMin = "Interruption must be 0 or more minutes";
  else if (e.interruptMin >= e.stopMin - e.startMin) errors.interruptMin = "Interruption must be shorter than the session";
  return errors;
}

/** Delta time in minutes = stop − start − interruption. Throws on an invalid entry. */
export function deltaMinutes(e: TimeEntryInput): number {
  const errors = timeEntryErrors(e);
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
  return e.stopMin - e.startMin - e.interruptMin;
}

/** Minutes → hours, rounded to 2 decimals (display and roll-ups). */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Workbook LOGT header: Hours = SUM(Delta) / 60. */
export function totalHours(entries: readonly { deltaMin: number }[]): number {
  return minutesToHours(entries.reduce((sum, e) => sum + e.deltaMin, 0));
}

/** The first existing session on the same day that overlaps [startMin, stopMin), if any. Back-to-back is fine. */
export function findOverlap<T extends { startMin: number; stopMin: number }>(
  entry: { startMin: number; stopMin: number },
  sameDay: readonly T[],
): T | undefined {
  return sameDay.find((o) => entry.startMin < o.stopMin && o.startMin < entry.stopMin);
}
