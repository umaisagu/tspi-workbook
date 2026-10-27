import "server-only";
import { db } from "@/lib/db";
import { milestoneCompletion, type Entry, type MilestoneCompletion } from "@/lib/tsp/completion";
import { contributions } from "@/lib/tsp/contribution";
import { DEV_PHASES } from "@/lib/tsp/quality";
import { peerComplete } from "@/lib/tsp/peer";
import { reportWeeks, weekReportDueAt } from "@/lib/tsp/week";
import { loadPlanning } from "@/lib/server/forms/planning";

/**
 * Everything the team dashboard, member dashboard and milestone view need:
 * planning figures, contribution per member, defects by phase and form completion per milestone.
 */
export async function loadTeamStatus(teamId: string, now: Date = new Date()) {
  const planning = await loadPlanning(teamId, now);
  const active = planning.members.filter((m) => m.active);
  const memberIds = active.map((m) => m.id);

  const [milestones, si, logt, logd, logai, tests, peers, components, weekReports, ccr] = await Promise.all([
    db.milestone.findMany({ where: { semesterId: planning.semester.id }, orderBy: { dueAt: "asc" } }),
    db.studentInfo.findMany({ where: { membershipId: { in: memberIds } }, select: { membershipId: true, submittedAt: true } }),
    db.timeLog.findMany({ where: { membershipId: { in: memberIds }, deletedAt: null }, select: { membershipId: true, date: true, createdAt: true } }),
    db.defectLog.findMany({
      where: { membership: { teamId }, deletedAt: null },
      select: { membershipId: true, date: true, createdAt: true, phaseInjected: true, phaseRemoved: true },
    }),
    db.aiLog.findMany({
      where: { membership: { teamId }, deletedAt: null },
      select: { membershipId: true, date: true, createdAt: true, reviewerMembershipId: true, approved: true },
    }),
    db.testLog.findMany({ where: { teamId, deletedAt: null }, select: { authorMembershipId: true, date: true, createdAt: true } }),
    db.peerEvaluation.findMany({ where: { evaluatorId: { in: memberIds } }, select: { milestoneId: true, evaluatorId: true, evaluateeId: true, submittedAt: true } }),
    db.component.findMany({ where: { teamId, deletedAt: null }, select: { updatedAt: true, actAdded: true, actBase: true, actModified: true, actReused: true } }),
    db.weeklyReport.findMany({ where: { teamId }, select: { week: true, submittedAt: true } }),
    db.changeRequest.findMany({ where: { teamId, deletedAt: null }, select: { date: true, createdAt: true } }),
  ]);
  const scheduleRows = await db.scheduleWeek.findMany({ where: { teamId }, select: { createdAt: true } });
  const taskRows = await db.task.findMany({ where: { teamId, deletedAt: null }, select: { createdAt: true } });

  const entries = <T extends { date: Date; createdAt: Date }>(rows: readonly T[]): Entry[] => rows.map((r) => ({ date: r.date, createdAt: r.createdAt }));
  const allReportWeeks = reportWeeks(planning.semester.weekCount, planning.semester.weekCount, planning.semester.breakWeeks);

  const completion: { id: string; code: string; title: string; week: number; dueAt: string; requiredForms: string[]; peerRequired: boolean; result: MilestoneCompletion }[] =
    milestones.map((ms) => ({
      id: ms.id,
      code: ms.code,
      title: ms.title,
      week: ms.week,
      dueAt: ms.dueAt.toISOString(),
      requiredForms: ms.requiredForms,
      peerRequired: ms.peerRequired,
      result: milestoneCompletion({
        dueAt: ms.dueAt,
        requiredForms: ms.requiredForms,
        peerRequired: ms.peerRequired,
        now,
        members: active.map((m) => {
          const mine = peers.filter((p) => p.milestoneId === ms.id && p.evaluatorId === m.id);
          const done = peerComplete(
            m.id,
            memberIds,
            mine.map((p) => ({ evaluatorId: p.evaluatorId, evaluateeId: p.evaluateeId, scores: {}, submitted: p.submittedAt !== null })),
          );
          return {
            memberId: m.id,
            siSubmittedAt: si.find((s) => s.membershipId === m.id)?.submittedAt ?? null,
            logt: entries(logt.filter((l) => l.membershipId === m.id)),
            logd: entries(logd.filter((l) => l.membershipId === m.id)),
            logai: entries(logai.filter((l) => l.membershipId === m.id)),
            peerSubmittedAt: done ? new Date(Math.max(...mine.map((p) => p.submittedAt!.getTime()))) : null,
          };
        }),
        team: {
          tasks: taskRows.map((t) => t.createdAt),
          schedule: scheduleRows.map((s) => s.createdAt),
          logtest: entries(tests),
          sums: components.filter((c) => c.actAdded + c.actBase + c.actModified + c.actReused > 0).map((c) => c.updatedAt),
          weekReports: allReportWeeks.map((w) => ({
            week: w,
            dueAt: weekReportDueAt(w, planning.semester.week1Monday),
            submittedAt: weekReports.find((r) => r.week === w)?.submittedAt ?? null,
          })),
          ccr: entries(ccr),
        },
      }),
    }));

  const contrib = contributions({
    members: active.map((m) => ({ id: m.id, name: m.name })),
    hours: planning.memberWeekHours.filter((h) => h.week <= planning.currentWeek),
    tasks: planning.tasks.map((t) => ({ assigneeId: t.assigneeMembershipId, completed: t.completedOn !== null, planValue: t.planValue })),
    defects: logd.map((d) => ({ memberId: d.membershipId })),
    aiEntries: logai.map((a) => ({ memberId: a.membershipId, reviewerId: a.reviewerMembershipId, approved: a.approved })),
    tests: tests.map((t) => ({ authorId: t.authorMembershipId })),
    currentWeek: planning.currentWeek,
  });

  const defectsByPhase = DEV_PHASES.map((p) => ({
    phase: p,
    injected: logd.filter((d) => d.phaseInjected === p).length,
    removed: logd.filter((d) => d.phaseRemoved === p).length,
  })).filter((r) => r.injected + r.removed > 0);

  // The milestone being worked towards: the first not yet due, else the last.
  const current = completion.find((c) => new Date(c.dueAt) >= now) ?? completion.at(-1) ?? null;

  return { planning, members: active, completion, current, contributions: contrib, defectsByPhase };
}
export type TeamStatus = Awaited<ReturnType<typeof loadTeamStatus>>;
