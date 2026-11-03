import type { TaskStatus } from "@/generated/prisma/enums";

/** Workbook v3.0 TASK status list (LISTS, Task Status). */
export const TASK_STATUSES: readonly { value: TaskStatus; label: string }[] = [
  { value: "PLANNED", label: "Planned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "COMPLETE", label: "Complete" },
  { value: "CARRIED_OVER", label: "Carried over" },
  { value: "CANCELLED", label: "Cancelled" },
];

/** Statuses the assigned member may set on their own task; the plan editors set any. */
export const MEMBER_TASK_STATUSES: readonly TaskStatus[] = ["PLANNED", "IN_PROGRESS", "COMPLETE"];

export function taskStatusLabel(s: TaskStatus): string {
  return TASK_STATUSES.find((x) => x.value === s)?.label ?? s;
}

/** Next Task ID T01, T02, … after the highest T-number in use (typed IDs that are not T-numbers are ignored). */
export function nextTaskCode(existing: readonly (string | null)[]): string {
  const max = existing.reduce((m, c) => {
    const n = /^T(\d+)$/i.exec(c ?? "")?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return `T${String(max + 1).padStart(2, "0")}`;
}

/**
 * A task is done or it is not: Complete needs the completion date (earned value is credited in its week),
 * and only a Complete task has one.
 */
export function taskStatusErrors(status: TaskStatus, completedOn: string | null): Partial<Record<"status" | "completedOn", string>> {
  if (status === "COMPLETE" && !completedOn) return { completedOn: "Enter the date the task was completed" };
  if (status !== "COMPLETE" && completedOn) return { status: "Set the status to Complete, or clear the completion date" };
  return {};
}
