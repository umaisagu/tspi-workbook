/**
 * TASK and SCHEDULE calculations (workbook Task/Schedule sheets; docs/workbook-formulas.md).
 *
 *  - Plan Value (PV) of a task = task plan hours / total plan hours (a fraction; shown as %).
 *  - Plan week = first schedule week whose cumulative planned hours >= the task's cumulative plan hours
 *    (tasks taken in plan order).
 *  - Earned Value (EV) = the task's PV, credited only in the week the task is completed (Actual Date).
 *  - SCHEDULE per week: planned hours, actual hours (LOGT), PV of tasks planned that week, EV of tasks
 *    completed that week, and running totals.
 *  - Predicted: future weeks continue at the average weekly EV (and hours) achieved so far.
 */

export interface PlanTask {
  id: string;
  order: number;
  planHours: number;
  /** Semester week the task was completed (Actual Week), or null if not complete. */
  completedWeek: number | null;
}

export interface TaskPlanResult {
  id: string;
  /** Fraction 0..1 */
  planValue: number;
  cumPlanHours: number;
  cumPlanValue: number;
  /** null when the schedule does not have enough hours to cover the task. */
  planWeek: number | null;
  earnedValue: number;
}

export interface ScheduleWeekRow {
  week: number;
  planHours: number;
  cumPlanHours: number;
  actualHours: number;
  cumActualHours: number;
  plannedValue: number;
  cumPlannedValue: number;
  earnedValue: number;
  cumEarnedValue: number;
  /** Only for weeks after the current week; null before. */
  predictedHours: number | null;
  cumPredictedHours: number | null;
  predictedEarnedValue: number | null;
  cumPredictedEarnedValue: number | null;
}

export interface PlanSummary {
  tasks: TaskPlanResult[];
  weeks: ScheduleWeekRow[];
  totalTaskPlanHours: number;
  totalSchedulePlanHours: number;
  /** Workbook SCHEDULE I5: task plan hours − schedule plan hours (> 0 means "add schedule hours"). */
  difference: number;
  unscheduledTaskIds: string[];
  /** First week the cumulative predicted EV reaches 100%, if within the schedule. */
  predictedCompletionWeek: number | null;
}

const EPS = 1e-9;
const round = (n: number, dp = 4) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Orders tasks the way the plan is read (by order, then id for stability). */
export function sortTasks<T extends { order: number; id: string }>(tasks: readonly T[]): T[] {
  return [...tasks].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Estimated hours = size / rate (workbook TASK), or null when either is missing or rate is 0. */
export function estimatedHours(size: number | null | undefined, rate: number | null | undefined): number | null {
  if (size === null || size === undefined || rate === null || rate === undefined || rate <= 0) return null;
  return round(size / rate, 2);
}

/** PV, cumulative plan hours/value, plan week and EV for each task. */
export function planTasks(tasks: readonly PlanTask[], schedule: ReadonlyMap<number, number>): TaskPlanResult[] {
  const ordered = sortTasks(tasks);
  const total = ordered.reduce((s, t) => s + t.planHours, 0);
  const weeks = [...schedule.keys()].sort((a, b) => a - b);
  let cumHours = 0;
  let cumValue = 0;
  return ordered.map((t) => {
    cumHours += t.planHours;
    const pv = total > 0 ? t.planHours / total : 0;
    cumValue += pv;
    let planWeek: number | null = null;
    let cumSchedule = 0;
    for (const w of weeks) {
      cumSchedule += schedule.get(w) ?? 0;
      if (cumSchedule + EPS >= cumHours && cumSchedule > 0) {
        planWeek = w;
        break;
      }
    }
    return {
      id: t.id,
      planValue: round(pv, 6),
      cumPlanHours: round(cumHours, 2),
      cumPlanValue: round(cumValue, 6),
      planWeek,
      earnedValue: t.completedWeek !== null ? round(pv, 6) : 0,
    };
  });
}

export interface ScheduleInput {
  tasks: readonly PlanTask[];
  /** week -> planned hours (team total) */
  schedule: ReadonlyMap<number, number>;
  /** week -> actual hours from LOGT (team total) */
  actualHours: ReadonlyMap<number, number>;
  /** Weeks shown, e.g. 1..15 */
  weeks: readonly number[];
  /** The current semester week; actuals stop and predictions start after it. */
  currentWeek: number;
  /** No-lab weeks: not counted when averaging, and nothing is predicted in them. */
  breakWeeks?: readonly number[];
}

/** The whole SCHEDULE sheet plus task results. */
export function buildSchedule(input: ScheduleInput): PlanSummary {
  const tasks = planTasks(input.tasks, input.schedule);
  const byId = new Map(input.tasks.map((t) => [t.id, t]));
  const totalTaskPlanHours = round(input.tasks.reduce((s, t) => s + t.planHours, 0), 2);
  const totalSchedulePlanHours = round([...input.schedule.values()].reduce((s, h) => s + h, 0), 2);

  const weeks: ScheduleWeekRow[] = [];
  let cumPlan = 0;
  let cumActual = 0;
  let cumPV = 0;
  let cumEV = 0;
  for (const week of input.weeks) {
    const planHours = input.schedule.get(week) ?? 0;
    const actualHours = week <= input.currentWeek ? (input.actualHours.get(week) ?? 0) : 0;
    const pv = tasks.filter((t) => t.planWeek === week).reduce((s, t) => s + t.planValue, 0);
    const ev = tasks.filter((t) => byId.get(t.id)?.completedWeek === week).reduce((s, t) => s + t.earnedValue, 0);
    cumPlan += planHours;
    cumActual += actualHours;
    cumPV += pv;
    cumEV += ev;
    weeks.push({
      week,
      planHours: round(planHours, 2),
      cumPlanHours: round(cumPlan, 2),
      actualHours: round(actualHours, 2),
      cumActualHours: round(cumActual, 2),
      plannedValue: round(pv, 6),
      cumPlannedValue: round(cumPV, 6),
      earnedValue: round(ev, 6),
      cumEarnedValue: round(cumEV, 6),
      predictedHours: null,
      cumPredictedHours: null,
      predictedEarnedValue: null,
      cumPredictedEarnedValue: null,
    });
  }

  // Predictions: average weekly EV and hours over the working weeks elapsed since the first planned week.
  const breaks = new Set(input.breakWeeks ?? []);
  const firstPlanned = weeks.find((w) => w.planHours > 0)?.week ?? input.weeks[0] ?? 1;
  const elapsed = weeks.filter((w) => w.week >= firstPlanned && w.week <= input.currentWeek && !breaks.has(w.week));
  const current = weeks.filter((w) => w.week <= input.currentWeek).at(-1);
  let predictedCompletionWeek: number | null = current && current.cumEarnedValue >= 1 - EPS ? current.week : null;
  if (current && elapsed.length > 0) {
    const avgEV = current.cumEarnedValue / elapsed.length;
    const avgHours = current.cumActualHours / elapsed.length;
    let cumPredEV = current.cumEarnedValue;
    let cumPredHours = current.cumActualHours;
    for (const w of weeks) {
      if (w.week <= input.currentWeek) continue;
      const working = !breaks.has(w.week);
      const ev = working ? Math.min(avgEV, Math.max(0, 1 - cumPredEV)) : 0;
      const hours = working ? avgHours : 0;
      cumPredEV += ev;
      cumPredHours += hours;
      w.predictedEarnedValue = round(ev, 6);
      w.cumPredictedEarnedValue = round(cumPredEV, 6);
      w.predictedHours = round(hours, 2);
      w.cumPredictedHours = round(cumPredHours, 2);
      if (predictedCompletionWeek === null && cumPredEV >= 1 - EPS) predictedCompletionWeek = w.week;
    }
  }

  return {
    tasks,
    weeks,
    totalTaskPlanHours,
    totalSchedulePlanHours,
    difference: round(totalTaskPlanHours - totalSchedulePlanHours, 2),
    unscheduledTaskIds: tasks.filter((t) => t.planWeek === null).map((t) => t.id),
    predictedCompletionWeek,
  };
}
