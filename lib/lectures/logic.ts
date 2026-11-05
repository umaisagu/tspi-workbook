/**
 * Lectures hub: pure rules. Opening a lecture and answering its check question are a light reading signal only —
 * never a flag, never part of contribution measures, never a mark.
 */
import type { LectureStatusValue, SeriesLecture } from "./types";

/** Codes of the lectures that belong to `week` (the "this week" marker). Planned lectures included. */
export function lecturesForWeek(lectures: readonly { code: string; weekNumber?: number | null }[], week: number): string[] {
  return lectures.filter((l) => l.weekNumber === week).map((l) => l.code);
}

/** Marks an answer. Out-of-range answers are wrong. */
export function markAnswer(check: { answerIndex: number; options: readonly string[] }, answerIndex: number): boolean {
  return answerIndex >= 0 && answerIndex < check.options.length && answerIndex === check.answerIndex;
}

/** A second open in the same browser session is not counted; the server also ignores opens within this window. */
export const REOPEN_WINDOW_MS = 30 * 60 * 1000;

/** Should an open at `now` increment the count, given the last recorded open? */
export function countsAsNewOpen(lastOpenedAt: Date | null | undefined, now: Date): boolean {
  return !lastOpenedAt || now.getTime() - lastOpenedAt.getTime() >= REOPEN_WINDOW_MS;
}

export interface StudentInScope {
  userId: string;
}
export interface ViewRow {
  userId: string;
  lastOpenedAt: Date;
  answeredAt: Date | null;
  correct: boolean | null;
}

/** Per-lecture aggregate over the students in scope (views of anyone else are ignored). */
export function lectureAggregate(students: readonly StudentInScope[], views: readonly ViewRow[]) {
  const inScope = new Set(students.map((s) => s.userId));
  const mine = views.filter((v) => inScope.has(v.userId));
  const answered = mine.filter((v) => v.answeredAt !== null);
  const correct = answered.filter((v) => v.correct === true).length;
  const last = mine.reduce<Date | null>((m, v) => (m === null || v.lastOpenedAt > m ? v.lastOpenedAt : m), null);
  return {
    students: inScope.size,
    opened: mine.length,
    openedShare: inScope.size === 0 ? null : mine.length / inScope.size,
    answered: answered.length,
    correct,
    accuracy: answered.length === 0 ? null : correct / answered.length,
    lastOpenedAt: last,
  };
}

export const STATUS_LABEL: Record<LectureStatusValue, string> = { DELIVERED: "Delivered", CURRENT: "Current", PLANNED: "Planned" };

export interface ExistingLecture {
  code: string;
  hasCheck: boolean;
  resourceKeys: readonly string[];
}

/** Resource identity for idempotent loads: kind + label. */
export const resourceKey = (r: { kind: string; label: string }) => `${r.kind}|${r.label.trim().toLowerCase()}`;

/**
 * What loading a series into a semester would add. Idempotent: lectures are matched by code (soft-deleted ones count
 * as present, so a removed lecture is not brought back), and existing lectures are never overwritten — only missing
 * resources and a missing check question are added.
 */
export function planSeriesLoad(series: readonly SeriesLecture[], existing: readonly ExistingLecture[]) {
  const byCode = new Map(existing.map((e) => [e.code, e]));
  const create: SeriesLecture[] = [];
  const addResources: { code: string; resources: SeriesLecture["resources"] }[] = [];
  const addChecks: { code: string; check: NonNullable<SeriesLecture["check"]> }[] = [];
  for (const l of series) {
    const e = byCode.get(l.code);
    if (!e) {
      create.push(l);
      continue;
    }
    const have = new Set(e.resourceKeys);
    const missing = l.resources.filter((r) => !have.has(resourceKey(r)));
    if (missing.length > 0) addResources.push({ code: l.code, resources: missing });
    if (l.check && !e.hasCheck) addChecks.push({ code: l.code, check: l.check });
  }
  return { create, addResources, addChecks, unchanged: series.length - create.length - new Set([...addResources, ...addChecks].map((x) => x.code)).size };
}
