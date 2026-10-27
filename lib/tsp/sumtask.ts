/**
 * SUMTASK: task summary rolled up from TASK and LOGT.
 * Per task: plan vs actual hours, deviation, CPI (plan/actual), plan vs actual week and status.
 * Roll-ups by phase, member and component, plus LOGT time not linked to any task.
 */

export type TaskStatus = "done" | "overdue" | "in_progress" | "not_started";

export interface SumTaskInput {
  id: string;
  name: string;
  phase: string;
  componentName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  planHours: number;
  planValue: number;
  planWeek: number | null;
  completedWeek: number | null;
  actualHours: number;
}

export interface SumTaskRow extends SumTaskInput {
  deviationHours: number;
  /** (actual − plan) / plan, null when plan is 0 */
  deviationPct: number | null;
  /** plan / actual, null when nothing logged */
  cpi: number | null;
  earnedValue: number;
  status: TaskStatus;
  /** Completed after the plan week (done) or still open after it (overdue): weeks late; else 0. */
  weeksLate: number;
}

export interface SumTaskGroup {
  key: string;
  label: string;
  tasks: number;
  done: number;
  overdue: number;
  planHours: number;
  actualHours: number;
  plannedValue: number;
  earnedValue: number;
  cpi: number | null;
}

export interface SumTaskResult {
  rows: SumTaskRow[];
  byPhase: SumTaskGroup[];
  byMember: SumTaskGroup[];
  byComponent: SumTaskGroup[];
  total: SumTaskGroup;
  /** LOGT hours with no task, per member id (and total). */
  unlinkedHours: { memberId: string; memberName: string; hours: number }[];
  unlinkedTotal: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

export function taskStatus(t: Pick<SumTaskInput, "completedWeek" | "planWeek" | "actualHours">, currentWeek: number): TaskStatus {
  if (t.completedWeek !== null) return "done";
  if (t.planWeek !== null && t.planWeek < currentWeek) return "overdue";
  return t.actualHours > 0 ? "in_progress" : "not_started";
}

function group(key: string, label: string, rows: readonly SumTaskRow[]): SumTaskGroup {
  const planHours = rows.reduce((s, r) => s + r.planHours, 0);
  const actualHours = rows.reduce((s, r) => s + r.actualHours, 0);
  return {
    key,
    label,
    tasks: rows.length,
    done: rows.filter((r) => r.status === "done").length,
    overdue: rows.filter((r) => r.status === "overdue").length,
    planHours: r2(planHours),
    actualHours: r2(actualHours),
    plannedValue: r4(rows.reduce((s, r) => s + r.planValue, 0)),
    earnedValue: r4(rows.reduce((s, r) => s + r.earnedValue, 0)),
    cpi: actualHours > 0 ? r2(planHours / actualHours) : null,
  };
}

function groupBy(rows: readonly SumTaskRow[], keyOf: (r: SumTaskRow) => string, labelOf: (r: SumTaskRow) => string): SumTaskGroup[] {
  const map = new Map<string, SumTaskRow[]>();
  for (const r of rows) map.set(keyOf(r), [...(map.get(keyOf(r)) ?? []), r]);
  return [...map.entries()].map(([k, rs]) => group(k, labelOf(rs[0]!), rs));
}

export function summariseTasks(
  tasks: readonly SumTaskInput[],
  currentWeek: number,
  unlinked: readonly { memberId: string; memberName: string; hours: number }[] = [],
  phaseOrder: readonly string[] = [],
): SumTaskResult {
  const rows: SumTaskRow[] = tasks.map((t) => {
    const status = taskStatus(t, currentWeek);
    const weeksLate =
      t.planWeek === null ? 0 : status === "done" ? Math.max(0, (t.completedWeek ?? 0) - t.planWeek) : status === "overdue" ? currentWeek - t.planWeek : 0;
    return {
      ...t,
      deviationHours: r2(t.actualHours - t.planHours),
      deviationPct: t.planHours > 0 ? r4((t.actualHours - t.planHours) / t.planHours) : null,
      cpi: t.actualHours > 0 ? r2(t.planHours / t.actualHours) : null,
      earnedValue: status === "done" ? t.planValue : 0,
      status,
      weeksLate,
    };
  });
  const order = (k: string) => {
    const i = phaseOrder.indexOf(k);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  return {
    rows,
    byPhase: groupBy(rows, (r) => r.phase, (r) => r.phase).sort((a, b) => order(a.key) - order(b.key)),
    byMember: groupBy(rows, (r) => r.assigneeId ?? "", (r) => r.assigneeName ?? "Unassigned").sort((a, b) => a.label.localeCompare(b.label)),
    byComponent: groupBy(rows, (r) => r.componentName ?? "", (r) => r.componentName ?? "No component").sort((a, b) => a.label.localeCompare(b.label)),
    total: group("total", "Total", rows),
    unlinkedHours: unlinked.map((u) => ({ ...u, hours: r2(u.hours) })),
    unlinkedTotal: r2(unlinked.reduce((s, u) => s + u.hours, 0)),
  };
}
