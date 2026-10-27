import "server-only";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/server/http";
import { formatClock, findOverlap } from "@/lib/tsp/time";
import { localDate, parseDateOnly } from "@/lib/tsp/calendar";

const invalid = (field: string, message: string) => new HttpError(400, "Please correct the highlighted fields.", { [field]: [message] });

/** Log dates are calendar dates (Malaysia time) and cannot be in the future. */
export function logDate(value: string, field = "date"): Date {
  const d = parseDateOnly(value);
  if (!d) throw invalid(field, "Enter a valid date");
  if (d.getTime() > localDate(new Date()).getTime()) throw invalid(field, "The date cannot be in the future");
  return d;
}

export async function assertComponent(teamId: string, componentId: string | null): Promise<void> {
  if (!componentId) return;
  const c = await db.component.findFirst({ where: { id: componentId, teamId, deletedAt: null }, select: { id: true } });
  if (!c) throw invalid("componentId", "Choose one of your team's components");
}

export async function assertTask(teamId: string, taskId: string | null): Promise<void> {
  if (!taskId) return;
  const t = await db.task.findFirst({ where: { id: taskId, teamId, deletedAt: null }, select: { id: true } });
  if (!t) throw invalid("taskId", "Choose one of your team's tasks");
}

export async function assertTeammate(teamId: string, membershipId: string | null, notSelf: string, field: string): Promise<void> {
  if (!membershipId) return;
  if (membershipId === notSelf) throw invalid(field, "Choose a teammate, not yourself");
  const m = await db.membership.findFirst({ where: { id: membershipId, teamId, leftAt: null }, select: { id: true } });
  if (!m) throw invalid(field, "Choose a current teammate");
}

/** One person cannot log two sessions at the same time. */
export async function assertNoOverlap(membershipId: string, date: Date, startMin: number, stopMin: number, exceptId?: string): Promise<void> {
  const sameDay = await db.timeLog.findMany({
    where: { membershipId, date, deletedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { startMin: true, stopMin: true },
  });
  const clash = findOverlap({ startMin, stopMin }, sameDay);
  if (clash) throw invalid("start", `Overlaps your ${formatClock(clash.startMin)}–${formatClock(clash.stopMin)} entry on this day`);
}

/** A LOGD "Fix Ref." must point at another defect in the same member's log. */
export async function assertFixRef(membershipId: string, fixRefId: string | null, selfId?: string): Promise<void> {
  if (!fixRefId) return;
  const ref = await db.defectLog.findFirst({ where: { id: fixRefId, membershipId, deletedAt: null }, select: { id: true } });
  if (!ref || ref.id === selfId) throw invalid("fixRefId", "Choose another defect from your log");
}

/** Retries `fn` when a unique constraint on a generated number/code collides with a concurrent insert. */
export async function withSequenceRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (err) {
      const code = typeof err === "object" && err !== null && "code" in err ? (err as { code: unknown }).code : undefined;
      if (code !== "P2002" || i >= attempts) throw err;
    }
  }
}
