import "server-only";
import { db } from "@/lib/db";
import { formatDateOnly, weekOf } from "@/lib/tsp/calendar";
import { reportWeeks, submissionStatus, weekReport, weekReportDueAt, type WeekReport } from "@/lib/tsp/week";
import { PEER_CRITERIA, peerComplete, type PeerRow } from "@/lib/tsp/peer";
import { loadPlanning } from "./planning";

// ---------- LOGTEST ----------

export async function listTests(teamId: string, week1Monday: Date) {
  const rows = await db.testLog.findMany({
    where: { teamId, deletedAt: null },
    orderBy: [{ date: "asc" }, { testCode: "asc" }],
    include: { author: { include: { user: { select: { name: true } } } } },
  });
  return rows.map((t) => ({
    id: t.id,
    testCode: t.testCode,
    module: t.module,
    description: t.description,
    type: t.type,
    expected: t.expected,
    actual: t.actual,
    status: t.status,
    date: formatDateOnly(t.date),
    week: weekOf(t.date, week1Monday),
    authorMembershipId: t.authorMembershipId,
    authorName: t.author.user.name,
  }));
}
export type TestRow = Awaited<ReturnType<typeof listTests>>[number];

// ---------- CCR ----------

export async function listChangeRequests(teamId: string) {
  const rows = await db.changeRequest.findMany({
    where: { teamId, deletedAt: null },
    orderBy: { number: "asc" },
    include: { requester: { include: { user: { select: { name: true } } } }, component: { select: { name: true } } },
  });
  const deciders = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.decidedById).filter((x): x is string => x !== null) } },
    select: { id: true, name: true },
  });
  return rows.map((c) => ({
    id: c.id,
    number: c.number,
    date: formatDateOnly(c.date),
    requesterMembershipId: c.requesterMembershipId,
    requesterName: c.requester.user.name,
    componentId: c.componentId,
    componentName: c.component?.name ?? null,
    description: c.description,
    reason: c.reason,
    impact: c.impact,
    priority: c.priority,
    status: c.status,
    decidedByName: deciders.find((d) => d.id === c.decidedById)?.name ?? null,
    decidedAt: c.decidedAt?.toISOString() ?? null,
  }));
}
export type ChangeRequestRow = Awaited<ReturnType<typeof listChangeRequests>>[number];

// ---------- WEEK ----------

/** The weekly reports a team owes so far, with status, and the computed figures for `selected`. */
export async function loadWeekReports(teamId: string, selected: number | null, now: Date = new Date()) {
  const planning = await loadPlanning(teamId, now);
  const { semester, currentWeek } = planning;
  const weeks = reportWeeks(currentWeek, semester.weekCount, semester.breakWeeks);
  const stored = await db.weeklyReport.findMany({ where: { teamId } });
  const list = weeks.map((w) => {
    const r = stored.find((s) => s.week === w);
    const dueAt = weekReportDueAt(w, semester.week1Monday);
    return { week: w, dueAt: dueAt.toISOString(), submittedAt: r?.submittedAt?.toISOString() ?? null, status: submissionStatus(r?.submittedAt ?? null, dueAt, now) };
  });
  const week = selected !== null && weeks.includes(selected) ? selected : (weeks.at(-1) ?? null);
  const report = week === null ? null : stored.find((s) => s.week === week) ?? null;
  return {
    list,
    week,
    report: report && {
      tasksCompleted: report.tasksCompleted,
      risksIssues: report.risksIssues,
      nextWeekPlan: report.nextWeekPlan,
      submittedAt: report.submittedAt?.toISOString() ?? null,
      /** Figures frozen at submission. */
      snapshot: report.snapshot as WeekReport | null,
    },
    live: week === null ? null : computeWeek(planning, week),
  };
}

export function computeWeek(planning: Awaited<ReturnType<typeof loadPlanning>>, week: number): WeekReport {
  return weekReport({
    week,
    members: planning.members.filter((m) => m.active),
    schedule: planning.scheduleByMember,
    logs: planning.memberWeekHours,
    tasks: planning.tasks.map((t) => ({
      id: t.id,
      name: t.name,
      phase: t.phase,
      assigneeId: t.assigneeMembershipId,
      planHours: t.planHours,
      actualHours: t.actualHours,
      planValue: t.planValue,
      planWeek: t.planWeek,
      completedWeek: t.completedWeek,
    })),
  });
}

// ---------- PEER ----------

/** Milestones that collect PEER, with the evaluator's ratings and status for each. */
export async function loadPeer(teamId: string, evaluatorId: string, now: Date = new Date()) {
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId }, include: { labGroup: true } });
  const [milestones, members, rows] = await Promise.all([
    db.milestone.findMany({ where: { semesterId: team.labGroup.semesterId, peerRequired: true }, orderBy: { dueAt: "asc" } }),
    db.membership.findMany({ where: { teamId, leftAt: null }, include: { user: { select: { name: true } } }, orderBy: { joinedAt: "asc" } }),
    db.peerEvaluation.findMany({ where: { evaluatorId } }),
  ]);
  const memberIds = members.map((m) => m.id);
  return {
    members: members.map((m) => ({ id: m.id, name: m.user.name, self: m.id === evaluatorId })),
    milestones: milestones.map((ms) => {
      const mine = rows.filter((r) => r.milestoneId === ms.id);
      const peerRows: PeerRow[] = mine.map((r) => ({ evaluatorId, evaluateeId: r.evaluateeId, scores: r.scores as Record<string, number>, submitted: r.submittedAt !== null }));
      const submittedAt = peerComplete(evaluatorId, memberIds, peerRows)
        ? new Date(Math.max(...mine.filter((r) => r.submittedAt).map((r) => r.submittedAt!.getTime())))
        : null;
      return {
        id: ms.id,
        code: ms.code,
        title: ms.title,
        dueAt: ms.dueAt.toISOString(),
        pastDue: ms.dueAt < now,
        status: submissionStatus(submittedAt, ms.dueAt, now),
        submittedAt: submittedAt?.toISOString() ?? null,
        ratings: mine.map((r) => ({
          evaluateeId: r.evaluateeId,
          scores: Object.fromEntries(PEER_CRITERIA.map((c) => [c.key, Number((r.scores as Record<string, unknown>)[c.key] ?? 0)])),
          comment: r.comment,
          submitted: r.submittedAt !== null,
        })),
      };
    }),
  };
}
export type PeerData = Awaited<ReturnType<typeof loadPeer>>;
