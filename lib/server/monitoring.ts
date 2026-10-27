import "server-only";
import type { FlagStatus, FlagType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { githubEnabled } from "@/lib/env";
import { isLecturer, type Viewer } from "@/lib/auth/permissions";
import { computeFlags, flagKey, type Flag } from "@/lib/monitoring/flags";
import { readThresholds, type Thresholds } from "@/lib/monitoring/settings";
import { teamStatus } from "@/lib/monitoring/status";
import { githubCounts } from "@/lib/github/parse";
import { weekOf } from "@/lib/tsp/calendar";
import { peerTotal } from "@/lib/tsp/peer";
import { submissionStatus } from "@/lib/tsp/week";
import { loadTeamStatus } from "@/lib/server/team-status";
import { loadWeekReports } from "@/lib/server/forms/team-forms";

const DAY = 86_400_000;

export async function thresholdsFor(semesterId: string): Promise<Thresholds> {
  const s = await db.monitoringSettings.findUnique({ where: { semesterId } });
  return readThresholds(s?.thresholds);
}

export interface FlagView extends Flag {
  memberName: string;
  status: FlagStatus;
  history: { status: FlagStatus; reason: string | null; by: string; at: string }[];
}

/** Monitoring view of one team: status, contribution table, heatmap, weekly completion and flags. */
export async function loadTeamMonitoring(teamId: string, viewer: Viewer, now: Date = new Date()) {
  const s = await loadTeamStatus(teamId, now);
  const { planning } = s;
  const week1 = planning.semester.week1Monday;
  const memberIds = s.members.map((m) => m.id);
  const wk = (d: Date) => weekOf(d, week1);
  const lecturer = isLecturer(viewer);

  const [thresholds, memberships, logt, logd, logai, tests, peers, milestones, github, reviews, weeks, lastTask, notes] = await Promise.all([
    thresholdsFor(planning.semester.id),
    db.membership.findMany({ where: { id: { in: memberIds } }, select: { id: true, joinedAt: true, roles: true } }),
    db.timeLog.findMany({ where: { membershipId: { in: memberIds }, deletedAt: null }, select: { membershipId: true, date: true, createdAt: true, deltaMin: true } }),
    db.defectLog.findMany({ where: { membershipId: { in: memberIds }, deletedAt: null }, select: { membershipId: true, date: true, createdAt: true, fixTimeMin: true } }),
    db.aiLog.findMany({ where: { membershipId: { in: memberIds }, deletedAt: null }, select: { membershipId: true, date: true, createdAt: true } }),
    db.testLog.findMany({ where: { teamId, deletedAt: null }, select: { authorMembershipId: true, date: true, createdAt: true } }),
    db.peerEvaluation.findMany({ where: { evaluatorId: { in: memberIds }, submittedAt: { not: null } }, include: { milestone: { select: { code: true } } } }),
    db.milestone.findMany({ where: { semesterId: planning.semester.id }, orderBy: { dueAt: "asc" } }),
    db.gitHubActivity.findMany({ where: { teamId }, select: { membershipId: true, kind: true, occurredAt: true } }),
    db.flagReview.findMany({ where: { membershipId: { in: memberIds } }, orderBy: { createdAt: "asc" } }),
    loadWeekReports(teamId, null, now),
    db.task.findFirst({ where: { teamId }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    lecturer
      ? db.lecturerNote.findMany({ where: { OR: [{ teamId }, { membershipId: { in: memberIds } }] }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } })
      : Promise.resolve([]),
  ]);
  const gh = githubEnabled();

  // ----- PEER status per member per milestone that collects it -----
  const peerStatus = milestones
    .filter((m) => m.peerRequired && m.requiredForms.includes("PEER"))
    .flatMap((m) =>
      s.members.map((mem) => {
        const mine = peers.filter((p) => p.milestoneId === m.id && p.evaluatorId === mem.id);
        const complete = memberIds.every((id) => mine.some((p) => p.evaluateeId === id));
        const at = complete ? new Date(Math.max(...mine.map((p) => p.submittedAt!.getTime()))) : null;
        return { milestone: m.code, memberId: mem.id, status: submissionStatus(at, m.dueAt, now) };
      }),
    );

  const flags: Flag[] = computeFlags({
    members: s.members.map((m) => {
      const ms = memberships.find((x) => x.id === m.id)!;
      return { id: m.id, name: m.name, joinedWeek: wk(ms.joinedAt), isLeader: ms.roles.some((r) => r.role === "TEAM_LEADER") };
    }),
    currentWeek: planning.currentWeek,
    breakWeeks: planning.semester.breakWeeks,
    milestones: milestones.map((m) => ({ code: m.code, week: m.week, dueAt: m.dueAt })),
    hours: planning.memberWeekHours.filter((x) => memberIds.includes(x.memberId) && x.week <= planning.currentWeek),
    entries: [
      ...logt.map((e) => ({ memberId: e.membershipId, form: "LOGT", date: e.date, createdAt: e.createdAt })),
      ...logd.map((e) => ({ memberId: e.membershipId, form: "LOGD", date: e.date, createdAt: e.createdAt })),
      ...logai.map((e) => ({ memberId: e.membershipId, form: "LOGAI", date: e.date, createdAt: e.createdAt })),
      ...tests.map((e) => ({ memberId: e.authorMembershipId, form: "LOGTEST", date: e.date, createdAt: e.createdAt })),
    ],
    tasks: planning.tasks.map((t) => ({ assigneeId: t.assigneeMembershipId, planValue: t.planValue, completedWeek: t.completedWeek })),
    tests: tests.map((t) => ({ authorId: t.authorMembershipId, week: wk(t.date) })),
    commits: github.filter((g) => g.kind === "COMMIT" && g.membershipId).map((g) => ({ memberId: g.membershipId!, week: wk(g.occurredAt) })),
    githubEnabled: gh,
    peer: peers.map((p) => ({ milestone: p.milestone.code, evaluatorId: p.evaluatorId, evaluateeId: p.evaluateeId, total: peerTotal(p.scores as Record<string, number>) })),
    peerStatus,
    weekReports: weeks.list.map((w) => ({ week: w.week, status: w.status })),
    thresholds,
  }).filter((f) => lecturer || f.type !== "PEER_MISMATCH"); // PEER ratings are visible only to the lecturer

  const names = Object.fromEntries(s.members.map((m) => [m.id, m.name]));
  const reviewerIds = [...new Set(reviews.map((r) => r.reviewedById))];
  const reviewers = new Map((await db.user.findMany({ where: { id: { in: reviewerIds } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const flagViews: FlagView[] = flags.map((f) => {
    const history = reviews
      .filter((r) => flagKey({ memberId: r.membershipId, type: r.type, periodKey: r.periodKey }) === flagKey(f))
      .map((r) => ({ status: r.status, reason: r.reason, by: reviewers.get(r.reviewedById) ?? "Lecturer", at: r.createdAt.toISOString() }));
    return { ...f, memberName: names[f.memberId] ?? "Member", status: history.at(-1)?.status ?? "OPEN", history };
  });

  // ----- contribution table -----
  const ghCounts = githubCounts(github);
  const latestPeerMs = [...new Set(peers.map((p) => p.milestone.code))].sort().at(-1) ?? null;
  const contribution = s.contributions.members.map((c) => {
    const received = peers.filter((p) => p.milestone.code === latestPeerMs && p.evaluateeId === c.memberId && p.evaluatorId !== c.memberId);
    const self = peers.find((p) => p.milestone.code === latestPeerMs && p.evaluateeId === c.memberId && p.evaluatorId === c.memberId);
    return {
      ...c,
      defectFixMinutes: logd.filter((d) => d.membershipId === c.memberId).reduce((x, d) => x + d.fixTimeMin, 0),
      github: gh ? (ghCounts.get(c.memberId) ?? { commits: 0, pullRequests: 0, reviews: 0 }) : null,
      peer: lecturer
        ? {
            milestone: latestPeerMs,
            receivedAverage: received.length ? received.reduce((x, p) => x + peerTotal(p.scores as Record<string, number>), 0) / received.length : null,
            ratings: received.length,
            self: self ? peerTotal(self.scores as Record<string, number>) : null,
          }
        : null,
      flags: flagViews.filter((f) => f.memberId === c.memberId && f.status === "OPEN").map((f) => f.type),
    };
  });
  const ghTotals = gh
    ? contribution.reduce((t, c) => ({ commits: t.commits + c.github!.commits, pullRequests: t.pullRequests + c.github!.pullRequests, reviews: t.reviews + c.github!.reviews }), { commits: 0, pullRequests: 0, reviews: 0 })
    : null;

  // ----- weekly heatmap and completion -----
  const weekNums = Array.from({ length: Math.max(planning.currentWeek, 1) }, (_, i) => i + 1);
  const lag = thresholds.backfill.lagDays * DAY;
  const heatmap = s.members.map((m) => ({
    memberId: m.id,
    name: m.name,
    weeks: weekNums.map((w) => {
      const rows = logt.filter((l) => l.membershipId === m.id && wk(l.date) === w);
      const hours = rows.reduce((x, l) => x + l.deltaMin, 0) / 60;
      const lateHours = rows.filter((l) => l.createdAt.getTime() + 8 * 3600_000 - l.date.getTime() >= lag).reduce((x, l) => x + l.deltaMin, 0) / 60;
      return {
        week: w,
        hours: Math.round(hours * 10) / 10,
        /** LOGT entries for this week typed ≥ lagDays after their date. */
        late: hours > 0 && lateHours / hours >= 0.5,
        logd: logd.filter((d) => d.membershipId === m.id && wk(d.date) === w).length,
        logai: logai.filter((a) => a.membershipId === m.id && wk(a.date) === w).length,
      };
    }),
  }));

  // ----- status -----
  const nowRow = planning.schedule.weeks.find((w) => w.week === planning.currentWeek);
  const activity = [...logt, ...logd, ...logai, ...tests].map((e) => e.createdAt.getTime());
  if (lastTask) activity.push(lastTask.updatedAt.getTime());
  const lastActivity = activity.length ? new Date(Math.max(...activity)) : null;
  const daysSinceActivity = lastActivity ? Math.floor((now.getTime() - lastActivity.getTime()) / DAY) : null;
  const missingForms = s.completion
    .filter((c) => new Date(c.dueAt) <= now)
    .reduce((x, c) => x + [...c.result.team, ...c.result.members.flatMap((m) => m.forms)].filter((f) => f.status === "missing").length, 0);
  const openFlags = flagViews.filter((f) => f.status === "OPEN");
  const status = teamStatus({
    cumEV: nowRow?.cumEarnedValue ?? 0,
    cumPV: nowRow?.cumPlannedValue ?? 0,
    missingForms,
    daysSinceActivity,
    openFlags: openFlags.length,
    thresholds,
  });

  return {
    teamId,
    planning,
    current: s.current,
    completion: s.completion,
    members: s.members,
    status,
    daysSinceActivity,
    lastActivity: lastActivity?.toISOString() ?? null,
    flags: flagViews,
    contribution,
    totals: { ...s.contributions.totals, github: ghTotals },
    fairShare: s.contributions.fairShare,
    heatmap,
    weekReports: weeks.list,
    githubEnabled: gh,
    notes: notes.map((n) => ({ id: n.id, body: n.body, membershipId: n.membershipId, teamId: n.teamId, author: n.author.name, at: n.createdAt.toISOString() })),
    thresholds,
    lecturer,
  };
}
export type TeamMonitoring = Awaited<ReturnType<typeof loadTeamMonitoring>>;

/** Teams the viewer may monitor in the active semester. */
export async function monitoredTeams(viewer: Viewer) {
  return db.team.findMany({
    where: { labGroup: { semester: { isActive: true }, ...(isLecturer(viewer) ? {} : { id: { in: [...viewer.demonstratorLabGroupIds] } }) } },
    include: { labGroup: true, githubSync: true },
    orderBy: [{ labGroup: { name: "asc" } }, { name: "asc" }],
  });
}

/** Class overview: one row per team plus the open flags across the class. */
export async function loadClassOverview(viewer: Viewer, now: Date = new Date()) {
  const teams = await monitoredTeams(viewer);
  const rows = [];
  const attention: (FlagView & { teamId: string; teamName: string })[] = [];
  for (const t of teams) {
    const m = await loadTeamMonitoring(t.id, viewer, now);
    const w = m.planning.schedule.weeks.find((x) => x.week === m.planning.currentWeek);
    rows.push({
      teamId: t.id,
      name: t.name,
      labGroupId: t.labGroupId,
      labGroup: t.labGroup.name,
      project: t.projectTitle,
      milestone: m.current ? { code: m.current.code, percent: m.current.result.percent } : null,
      ev: w?.cumEarnedValue ?? 0,
      pv: w?.cumPlannedValue ?? 0,
      actualHours: w?.cumActualHours ?? 0,
      planHours: w?.cumPlanHours ?? 0,
      daysSinceActivity: m.daysSinceActivity,
      status: m.status,
      openFlags: m.flags.filter((f) => f.status === "OPEN").length,
      githubSyncedAt: t.githubSync?.lastSyncedAt?.toISOString() ?? null,
      githubError: t.githubSync?.lastError ?? null,
    });
    attention.push(...m.flags.filter((f) => f.status === "OPEN").map((f) => ({ ...f, teamId: t.id, teamName: t.name })));
  }
  return { rows, attention, githubEnabled: githubEnabled() };
}

export const FLAG_ORDER: FlagType[] = ["INACTIVE", "LOW_SHARE", "BACKFILL", "HOURS_NO_OUTPUT", "PEER_MISMATCH", "MISSING_FORMS"];
