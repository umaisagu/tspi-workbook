import "server-only";
import { db } from "@/lib/db";
import { buildSchedule, estimatedHours, sortTasks } from "@/lib/tsp/earned-value";
import { formatDateOnly, localDate, weekOf } from "@/lib/tsp/calendar";
import { PHASES } from "@/lib/tsp/phases";
import { summariseTasks } from "@/lib/tsp/sumtask";

/**
 * Everything the TASK, SCHEDULE and SUMTASK views need for one team, computed with lib/tsp.
 * Actual hours come from LOGT (team members' entries, including members who have left).
 */
export async function loadPlanning(teamId: string, now: Date = new Date()) {
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId }, include: { labGroup: { include: { semester: true } } } });
  const semester = team.labGroup.semester;
  const week1 = semester.week1Monday;
  const currentWeek = Math.min(Math.max(weekOf(localDate(now), week1), 0), semester.weekCount);
  const weeks = Array.from({ length: semester.weekCount }, (_, i) => i + 1);

  const [tasks, scheduleRows, members, logs] = await Promise.all([
    db.task.findMany({
      where: { teamId, deletedAt: null },
      include: { component: { select: { name: true } }, assignee: { include: { user: { select: { name: true } } } } },
    }),
    db.scheduleWeek.findMany({ where: { teamId } }),
    db.membership.findMany({ where: { teamId }, include: { user: { select: { name: true } } }, orderBy: { joinedAt: "asc" } }),
    db.timeLog.findMany({
      where: { deletedAt: null, membership: { teamId } },
      select: { date: true, deltaMin: true, taskId: true, membershipId: true },
    }),
  ]);

  // LOGT roll-ups
  const actualByWeek = new Map<number, number>();
  const actualByTask = new Map<string, number>();
  const unlinkedByMember = new Map<string, number>();
  for (const l of logs) {
    const h = l.deltaMin / 60;
    const w = weekOf(l.date, week1);
    actualByWeek.set(w, (actualByWeek.get(w) ?? 0) + h);
    if (l.taskId) actualByTask.set(l.taskId, (actualByTask.get(l.taskId) ?? 0) + h);
    else unlinkedByMember.set(l.membershipId, (unlinkedByMember.get(l.membershipId) ?? 0) + h);
  }

  // SCHEDULE plan hours: per member and team total
  const scheduleTotal = new Map<number, number>();
  const scheduleByMember = new Map<string, Map<number, number>>();
  for (const s of scheduleRows) {
    const h = Number(s.planHours);
    scheduleTotal.set(s.week, (scheduleTotal.get(s.week) ?? 0) + h);
    const m = scheduleByMember.get(s.membershipId) ?? new Map<number, number>();
    m.set(s.week, h);
    scheduleByMember.set(s.membershipId, m);
  }

  const ordered = sortTasks(tasks.map((t) => ({ ...t, order: t.order })));
  const plan = buildSchedule({
    tasks: ordered.map((t) => ({
      id: t.id,
      order: t.order,
      planHours: Number(t.planHours),
      completedWeek: t.completedOn ? weekOf(t.completedOn, week1) : null,
    })),
    schedule: scheduleTotal,
    actualHours: actualByWeek,
    weeks,
    currentWeek,
    breakWeeks: semester.breakWeeks,
  });
  const planById = new Map(plan.tasks.map((p) => [p.id, p]));

  const taskRows = ordered.map((t) => {
    const p = planById.get(t.id)!;
    const completedWeek = t.completedOn ? weekOf(t.completedOn, week1) : null;
    return {
      id: t.id,
      order: t.order,
      name: t.name,
      phase: t.phase,
      componentId: t.componentId,
      componentName: t.component?.name ?? null,
      assigneeMembershipId: t.assigneeMembershipId,
      assigneeName: t.assignee?.user.name ?? null,
      planHours: Number(t.planHours),
      estSize: t.estSize === null ? null : Number(t.estSize),
      sizeMeasure: t.sizeMeasure,
      rate: t.rate === null ? null : Number(t.rate),
      estimatedHours: estimatedHours(t.estSize === null ? null : Number(t.estSize), t.rate === null ? null : Number(t.rate)),
      planValue: p.planValue,
      cumPlanHours: p.cumPlanHours,
      cumPlanValue: p.cumPlanValue,
      planWeek: p.planWeek,
      planDate: p.planWeek ? formatDateOnly(new Date(week1.getTime() + (p.planWeek - 1) * 7 * 86400000)) : null,
      actualHours: Math.round((actualByTask.get(t.id) ?? 0) * 100) / 100,
      completedOn: t.completedOn ? formatDateOnly(t.completedOn) : null,
      completedWeek,
      earnedValue: p.earnedValue,
      updatedAt: t.updatedAt.toISOString(),
    };
  });

  const memberName = new Map(members.map((m) => [m.id, m.user.name]));
  const sumtask = summariseTasks(
    taskRows.map((t) => ({
      id: t.id,
      name: t.name,
      phase: t.phase,
      componentName: t.componentName,
      assigneeId: t.assigneeMembershipId,
      assigneeName: t.assigneeName,
      planHours: t.planHours,
      planValue: t.planValue,
      planWeek: t.planWeek,
      completedWeek: t.completedWeek,
      actualHours: t.actualHours,
    })),
    currentWeek,
    [...unlinkedByMember.entries()].map(([id, hours]) => ({ memberId: id, memberName: memberName.get(id) ?? "Former member", hours })),
    PHASES.map((p) => p.code),
  );

  const scheduleGrid = members
    .filter((m) => m.leftAt === null || scheduleByMember.has(m.id))
    .map((m) => ({
      membershipId: m.id,
      name: m.user.name,
      active: m.leftAt === null,
      hours: Object.fromEntries(weeks.map((w) => [w, scheduleByMember.get(m.id)?.get(w) ?? 0])) as Record<number, number>,
    }));

  return {
    teamId,
    semester: { id: semester.id, name: semester.name, weekCount: semester.weekCount, breakWeeks: semester.breakWeeks, hiddenPhases: semester.hiddenPhases },
    week1: formatDateOnly(week1),
    currentWeek,
    weeks,
    tasks: taskRows,
    schedule: { ...plan, tasks: undefined },
    scheduleGrid,
    sumtask,
  };
}
export type Planning = Awaited<ReturnType<typeof loadPlanning>>;
export type TaskRow = Planning["tasks"][number];
