/**
 * WEEK: weekly status report (workbook WEEK sheet) plus the course's typed sections
 * (risks and issues, next week's plan). Reports run from Week 5 (CLAUDE.md decision 5) and are
 * due before the following Wednesday lab (16:00 Malaysia time).
 */
import { myTime, weekStart } from "./calendar";

export const FIRST_REPORT_WEEK = 5;

export interface WeekMember {
  id: string;
  name: string;
  roles: readonly string[];
}

export interface WeekTask {
  id: string;
  name: string;
  phase: string;
  assigneeId: string | null;
  planHours: number;
  actualHours: number;
  planValue: number;
  planWeek: number | null;
  completedWeek: number | null;
}

export interface WeekInput {
  week: number;
  members: readonly WeekMember[];
  /** member id -> week -> planned hours */
  schedule: ReadonlyMap<string, ReadonlyMap<number, number>>;
  /** LOGT hours by member and week */
  logs: readonly { memberId: string; week: number; hours: number }[];
  tasks: readonly WeekTask[];
}

export interface PlanActualPair {
  plan: number;
  actual: number;
  /** Workbook "Plan/Actual" column; null when actual is 0. */
  ratio: number | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const pair = (plan: number, actual: number, round = r2): PlanActualPair => ({
  plan: round(plan),
  actual: round(actual),
  ratio: actual === 0 ? null : r2(plan / actual),
});

export function weekReport(input: WeekInput) {
  const { week } = input;
  const planIn = (pred: (w: number) => boolean) => {
    let s = 0;
    for (const byWeek of input.schedule.values()) for (const [w, h] of byWeek) if (pred(w)) s += h;
    return s;
  };
  const actualIn = (pred: (w: number) => boolean) => input.logs.filter((l) => pred(l.week)).reduce((s, l) => s + l.hours, 0);
  const pvIn = (pred: (w: number) => boolean) => input.tasks.filter((t) => t.planWeek !== null && pred(t.planWeek)).reduce((s, t) => s + t.planValue, 0);
  const evIn = (pred: (w: number) => boolean) => input.tasks.filter((t) => t.completedWeek !== null && pred(t.completedWeek)).reduce((s, t) => s + t.planValue, 0);
  const thisWeek = (w: number) => w === week;
  const toDate = (w: number) => w <= week;
  const doneToDate = input.tasks.filter((t) => t.completedWeek !== null && t.completedWeek <= week);
  const scheduleToDate = pair(planIn(toDate), actualIn(toDate));

  return {
    week,
    scheduleHours: { thisWeek: pair(planIn(thisWeek), actualIn(thisWeek)), toDate: scheduleToDate },
    earnedValue: { thisWeek: pair(pvIn(thisWeek), evIn(thisWeek), r4), toDate: pair(pvIn(toDate), evIn(toDate), r4) },
    /** Plan and actual hours of the tasks completed so far. */
    completedTaskHours: pair(
      doneToDate.reduce((s, t) => s + t.planHours, 0),
      doneToDate.reduce((s, t) => s + t.actualHours, 0),
    ),
    /** Workbook M12/O12: to-date hours ÷ week number. */
    averageHoursPerWeek: pair(scheduleToDate.plan / Math.max(week, 1), scheduleToDate.actual / Math.max(week, 1)),
    members: input.members.map((m) => ({
      id: m.id,
      name: m.name,
      roles: m.roles,
      planHours: r2(input.schedule.get(m.id)?.get(week) ?? 0),
      actualHours: r2(input.logs.filter((l) => l.memberId === m.id && l.week === week).reduce((s, l) => s + l.hours, 0)),
      plannedValue: r4(input.tasks.filter((t) => t.assigneeId === m.id && t.planWeek === week).reduce((s, t) => s + t.planValue, 0)),
      earnedValue: r4(input.tasks.filter((t) => t.assigneeId === m.id && t.completedWeek === week).reduce((s, t) => s + t.planValue, 0)),
    })),
    tasksCompleted: input.tasks.filter((t) => t.completedWeek === week),
    /** Planned for this week (or earlier) and still open. */
    tasksDue: input.tasks.filter((t) => t.completedWeek === null && t.planWeek !== null && t.planWeek <= week),
  };
}
export type WeekReport = ReturnType<typeof weekReport>;

/** Report weeks so far: from Week 5 to the current week, skipping break weeks. */
export function reportWeeks(currentWeek: number, weekCount: number, breakWeeks: readonly number[]): number[] {
  const out: number[] = [];
  for (let w = FIRST_REPORT_WEEK; w <= Math.min(currentWeek, weekCount); w++) if (!breakWeeks.includes(w)) out.push(w);
  return out;
}

/** Due before the next Wednesday lab: Wednesday of the following week, 16:00 Malaysia time. */
export function weekReportDueAt(week: number, week1Monday: Date): Date {
  const wednesday = new Date(weekStart(week + 1, week1Monday).getTime() + 2 * 86400000);
  return myTime(wednesday, 16, 0);
}

export type SubmissionStatus = "submitted" | "late" | "missing" | "open";

/** submitted on time / late / missing (past due) / open (not yet due). */
export function submissionStatus(submittedAt: Date | null, dueAt: Date, now: Date): SubmissionStatus {
  if (submittedAt) return submittedAt.getTime() <= dueAt.getTime() ? "submitted" : "late";
  return now.getTime() > dueAt.getTime() ? "missing" : "open";
}
