import "server-only";
import { db } from "@/lib/db";
import type { ExportDoc, Section } from "@/lib/export/document";
import { FLAG_LABELS } from "@/lib/monitoring/flags";
import { CONTRIBUTION_MEASURES, contributions } from "@/lib/tsp/contribution";
import { weekOf } from "@/lib/tsp/calendar";
import { PEER_CRITERIA, peerTotal } from "@/lib/tsp/peer";
import { FORM_INFO } from "@/lib/forms";
import type { Viewer } from "@/lib/auth/permissions";
import { notFound } from "@/lib/server/http";
import { loadTeamMonitoring } from "@/lib/server/monitoring";
import { myt } from "./sections";

/**
 * One member's contribution in one milestone period (weeks after the previous milestone up to this one,
 * or up to the current week while it is in progress), compared with the team. Lecturer only: includes PEER.
 */
export async function contributionReport(membershipId: string, milestoneId: string, viewer: Viewer, now: Date = new Date()): Promise<{ doc: ExportDoc; teamId: string; parts: string[] }> {
  const member = await db.membership.findUnique({ where: { id: membershipId }, include: { user: { select: { name: true } }, team: { include: { labGroup: true } } } });
  const milestone = await db.milestone.findUnique({ where: { id: milestoneId } });
  if (!member || !milestone || milestone.semesterId !== member.team.labGroup.semesterId) throw notFound("Report");
  const teamId = member.teamId;

  const m = await loadTeamMonitoring(teamId, viewer, now);
  const { planning } = m;
  const week1 = planning.semester.week1Monday;
  const milestones = await db.milestone.findMany({ where: { semesterId: milestone.semesterId }, orderBy: { dueAt: "asc" } });
  const idx = milestones.findIndex((x) => x.id === milestone.id);
  const from = idx > 0 ? milestones[idx - 1]!.week + 1 : 1;
  const to = Math.min(milestone.week, planning.currentWeek);
  const inPeriod = (w: number | null) => w !== null && w >= from && w <= to;
  const wk = (d: Date) => weekOf(d, week1);

  const ids = m.members.map((x) => x.id);
  if (!ids.includes(membershipId)) ids.push(membershipId); // a member who has left still gets a report
  const [logd, logai, tests, github, peers, reviews] = await Promise.all([
    db.defectLog.findMany({ where: { membershipId: { in: ids }, deletedAt: null }, select: { membershipId: true, date: true } }),
    db.aiLog.findMany({ where: { membershipId: { in: ids }, deletedAt: null }, select: { membershipId: true, date: true, reviewerMembershipId: true, approved: true } }),
    db.testLog.findMany({ where: { teamId, deletedAt: null }, select: { authorMembershipId: true, date: true } }),
    db.gitHubActivity.findMany({ where: { teamId, membershipId: { not: null } }, select: { membershipId: true, kind: true, occurredAt: true } }),
    db.peerEvaluation.findMany({ where: { milestoneId, evaluateeId: membershipId, submittedAt: { not: null } } }),
    db.flagReview.findMany({ where: { membershipId }, orderBy: { createdAt: "asc" } }),
  ]);
  const reviewers = new Map((await db.user.findMany({ where: { id: { in: reviews.map((r) => r.reviewedById) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const names = new Map([...planning.members.map((x) => [x.id, x.name] as const)]);
  const people = ids.map((id) => ({ id, name: names.get(id) ?? "Member" }));

  const c = contributions({
    members: people,
    hours: planning.memberWeekHours.filter((h) => inPeriod(h.week)),
    tasks: planning.tasks.map((t) => ({ assigneeId: t.assigneeMembershipId, completed: inPeriod(t.completedWeek), planValue: t.planValue })),
    defects: logd.filter((d) => inPeriod(wk(d.date))).map((d) => ({ memberId: d.membershipId })),
    aiEntries: logai.filter((a) => inPeriod(wk(a.date))).map((a) => ({ memberId: a.membershipId, reviewerId: a.reviewerMembershipId, approved: a.approved })),
    tests: tests.filter((t) => inPeriod(wk(t.date))).map((t) => ({ authorId: t.authorMembershipId })),
    currentWeek: to,
  });
  const mine = c.members.find((x) => x.memberId === membershipId)!;
  const n = people.length;

  const sections: Section[] = [];
  sections.push({
    title: "Contribution",
    notes: [`Weeks ${from}–${to}. Fair share with ${n} members: ${(100 / n).toFixed(1)}%.`, "Flags and shares are prompts for review, not grades."],
    columns: [
      { header: "Measure", width: 30 },
      { header: "Member", width: 9 },
      { header: "Team total", width: 9 },
      { header: "Team average", width: 9, format: "dec" },
      { header: "Share", width: 8, format: "pct" },
    ],
    rows: CONTRIBUTION_MEASURES.filter((x) => x.key !== "recentHours").map((x) => [x.label, mine.values[x.key], c.totals[x.key], c.average[x.key], mine.shares[x.key]]),
  });

  if (m.githubEnabled) {
    const gh = github.filter((g) => inPeriod(wk(g.occurredAt)));
    const count = (kind: string, id?: string) => gh.filter((g) => g.kind === kind && (id === undefined || g.membershipId === id)).length;
    sections.push({
      title: "GitHub",
      columns: [{ header: "Activity", width: 20 }, { header: "Member", width: 9, format: "int" }, { header: "Team total", width: 9, format: "int" }, { header: "Share", width: 8, format: "pct" }],
      rows: (
        [
          ["Commits", "COMMIT"],
          ["Pull requests", "PULL_REQUEST"],
          ["Reviews", "REVIEW"],
        ] as const
      ).map(([label, kind]) => {
        const total = count(kind);
        return [label, count(kind, membershipId), total, total ? count(kind, membershipId) / total : null];
      }),
    });
  }

  sections.push({
    title: "Hours by week",
    columns: [{ header: "Week", width: 6, format: "int" }, { header: "Plan h (SCHEDULE)", width: 14 }, { header: "Actual h (LOGT)", width: 12, format: "dec" }, { header: "Team actual h", width: 10, format: "dec" }, { header: "Share", width: 8, format: "pct" }, { header: "Entered late", width: 8 }],
    rows: Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i).map((w) => {
      const h = planning.memberWeekHours.filter((x) => x.week === w);
      const own = h.filter((x) => x.memberId === membershipId).reduce((s, x) => s + x.hours, 0);
      const team = h.filter((x) => ids.includes(x.memberId)).reduce((s, x) => s + x.hours, 0);
      const heat = m.heatmap.find((x) => x.memberId === membershipId)?.weeks.find((x) => x.week === w);
      return [w, planning.scheduleByMember.get(membershipId)?.get(w) ?? 0, own, team, team ? own / team : null, heat?.late ?? false];
    }),
  });

  const received = peers.filter((p) => p.evaluatorId !== membershipId);
  const self = peers.find((p) => p.evaluatorId === membershipId);
  const avg = (key: string) => (received.length ? received.reduce((s, p) => s + Number((p.scores as Record<string, number>)[key] ?? 0), 0) / received.length : null);
  sections.push({
    title: `PEER ${milestone.code}`,
    notes: [`${received.length} teammate rating(s) received.${milestone.peerRequired ? "" : " PEER is not collected at this milestone."}`],
    columns: [{ header: "Criterion", width: 26 }, { header: "Average received", width: 10, format: "dec" }, { header: "Self", width: 8, format: "int" }],
    rows: [
      ...PEER_CRITERIA.map((k) => [k.label, avg(k.key), self ? ((self.scores as Record<string, number>)[k.key] ?? null) : null]),
      ["Total /50", received.length ? received.reduce((s, p) => s + peerTotal(p.scores as Record<string, number>), 0) / received.length : null, self ? peerTotal(self.scores as Record<string, number>) : null],
    ],
  });

  const comp = m.completion.find((x) => x.id === milestone.id);
  const own = comp?.result.members.find((x) => x.memberId === membershipId);
  sections.push({
    title: `Forms ${milestone.code}`,
    notes: [`Due ${myt(milestone.dueAt)} MYT.`],
    columns: [{ header: "Form", width: 30 }, { header: "Status", width: 10 }],
    rows: [...(own?.forms ?? []).map((f) => [FORM_INFO[f.form].title, f.status]), ...(comp?.result.team ?? []).map((f) => [`${FORM_INFO[f.form].title} (team)`, f.status])],
  });

  const flags = m.flags.filter((f) => f.memberId === membershipId);
  sections.push({
    title: "Flags",
    notes: ["Current flags, computed at generation time, with their review status."],
    columns: [{ header: "Flag", width: 18 }, { header: "Period", width: 10 }, { header: "Status", width: 10 }, { header: "Evidence", width: 60 }],
    rows: flags.map((f) => [FLAG_LABELS[f.type], f.periodKey, f.status, f.summary]),
  });
  sections.push({
    title: "Flag review history",
    columns: [{ header: "When (MYT)", width: 15 }, { header: "Flag", width: 18 }, { header: "Period", width: 10 }, { header: "Status", width: 10 }, { header: "By", width: 16 }, { header: "Reason", width: 40 }],
    rows: reviews.map((r) => [myt(r.createdAt), FLAG_LABELS[r.type], r.periodKey, r.status, reviewers.get(r.reviewedById) ?? "Lecturer", r.reason]),
  });
  const notes = m.notes.filter((x) => x.membershipId === membershipId);
  if (notes.length) {
    sections.push({
      title: "Lecturer notes",
      columns: [{ header: "When (MYT)", width: 15 }, { header: "By", width: 16 }, { header: "Note", width: 70 }],
      rows: notes.map((x) => [myt(x.at), x.author, x.body]),
    });
  }

  const name = names.get(membershipId) ?? member.user.name;
  return {
    teamId,
    parts: [member.team.name, name, milestone.code, "contribution"],
    doc: {
      title: `Contribution report — ${name}, ${member.team.name}, ${milestone.code}`,
      subtitle: `${milestone.title}. ${planning.semester.name}. Private: lecturer only.`,
      generatedAt: now,
      sections,
    },
  };
}
