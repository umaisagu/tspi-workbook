import "server-only";
import type { FormType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import type { Section } from "@/lib/export/document";
import { FORM_INFO } from "@/lib/forms";
import { defectTypeLabel } from "@/lib/tsp/defects";
import { PEER_CRITERIA, peerTotal } from "@/lib/tsp/peer";
import { TSPI_ROLES } from "@/lib/tsp/roles";
import { formatDateOnly } from "@/lib/tsp/calendar";
import { reportWeeks, submissionStatus, weekReportDueAt, type WeekReport } from "@/lib/tsp/week";
import { listAiLogs, listDefectLogs, listTimeLogs } from "@/lib/server/forms/logs";
import { loadPlanning, type Planning } from "@/lib/server/forms/planning";
import { loadSums, loadSumpSumq } from "@/lib/server/forms/quality";
import { computeWeek, listChangeRequests, listTests } from "@/lib/server/forms/team-forms";

/** "YYYY-MM-DD HH:mm" in Malaysia time (UTC+8, no DST). */
export function myt(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  const t = typeof d === "string" ? new Date(d) : d;
  return new Date(t.getTime() + 8 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
}

const roleLabel = (r: string) => TSPI_ROLES.find((x) => x.role === r)?.label ?? r;
const title = (form: FormType) => FORM_INFO[form].title.split(" · ")[0]!;

/** Forms in export order. PEER is included only when `includePeer` (lecturer). */
export const EXPORT_FORMS: FormType[] = ["SI", "LOGT", "LOGD", "LOGAI", "PEER", "TASK", "SCHEDULE", "SUMTASK", "LOGTEST", "WEEK", "SUMS", "SUMP", "SUMQ", "CCR"];

export interface ExportContext {
  teamId: string;
  planning: Planning;
  /** Members of the team (including former ones), in join order. */
  members: { id: string; name: string; active: boolean }[];
  includePeer: boolean;
  now: Date;
}

export async function exportContext(teamId: string, includePeer: boolean, now: Date = new Date()): Promise<ExportContext> {
  const planning = await loadPlanning(teamId, now);
  return { teamId, planning, members: planning.members.map((m) => ({ id: m.id, name: m.name, active: m.active })), includePeer, now };
}

export function membersSection(ctx: ExportContext): Section {
  return {
    title: "Members",
    columns: [{ header: "Member", width: 24 }, { header: "TSPi roles", width: 36 }, { header: "Status", width: 10 }],
    rows: ctx.planning.members.map((m) => [m.name, m.roles.map(roleLabel).join(", "), m.active ? "Active" : "Left"]),
  };
}

/** The sections of one form for the whole team (individual forms list every member's rows). */
export async function formSections(form: FormType, ctx: ExportContext): Promise<Section[]> {
  const w1 = ctx.planning.semester.week1Monday;
  const t = title(form);
  switch (form) {
    case "SI": {
      const rows = await db.studentInfo.findMany({ where: { membershipId: { in: ctx.members.map((m) => m.id) } } });
      return [
        {
          title: t,
          columns: [
            { header: "Member", width: 22 },
            { header: "Full name", width: 24 },
            { header: "Matric no.", width: 12 },
            { header: "Programme", width: 20 },
            { header: "Year", width: 6, format: "int" },
            { header: "Credits", width: 8, format: "int" },
            { header: "GitHub", width: 14 },
            { header: "Skills (1–5)", width: 40 },
            { header: "Role preferences (1 = first choice)", width: 40 },
            { header: "Meeting availability", width: 24 },
            { header: "Submitted", width: 16 },
          ],
          rows: ctx.members.map((m) => {
            const si = rows.find((r) => r.membershipId === m.id);
            if (!si) return [m.name, "Not submitted"];
            const skills = Object.entries((si.skills ?? {}) as Record<string, { rating?: number }>)
              .map(([k, v]) => `${k} ${v?.rating ?? "—"}`)
              .join(", ");
            const prefs = Object.entries((si.rolePreferences ?? {}) as Record<string, number>)
              .sort((a, b) => a[1] - b[1])
              .map(([r, n]) => `${n}. ${roleLabel(r)}`)
              .join(", ");
            return [m.name, si.fullName, si.matricNo, si.programme, si.yearOfStudy, si.creditsRegistered, si.githubUsername, skills, prefs, si.meetingAvailability.join(", "), myt(si.submittedAt)];
          }),
        },
      ];
    }
    case "LOGT": {
      const rows = (await Promise.all(ctx.members.map(async (m) => (await listTimeLogs(m.id, w1)).map((r) => ({ m, r }))))).flat();
      return [
        {
          title: t,
          notes: [`Total ${(rows.reduce((s, x) => s + x.r.deltaMin, 0) / 60).toFixed(2)} h in ${rows.length} entries.`],
          columns: [
            { header: "Member", width: 20 },
            { header: "Date", width: 11 },
            { header: "Week", width: 6, format: "int" },
            { header: "Start", width: 7 },
            { header: "Stop", width: 7 },
            { header: "Interrupt (min)", width: 9, format: "int" },
            { header: "Delta (min)", width: 9, format: "int" },
            { header: "Phase", width: 10 },
            { header: "Component", width: 16 },
            { header: "Task", width: 22 },
            { header: "Comments", width: 30 },
            { header: "Entered", width: 16 },
          ],
          rows: rows.map(({ m, r }) => [m.name, r.date, r.week, r.start, r.stop, r.interruptMin, r.deltaMin, r.phase, r.componentName, r.taskName, r.comments, myt(r.createdAt)]),
        },
      ];
    }
    case "LOGD": {
      const rows = (await Promise.all(ctx.members.map(async (m) => (await listDefectLogs(m.id, w1)).map((r) => ({ m, r }))))).flat();
      return [
        {
          title: t,
          columns: [
            { header: "Member", width: 20 },
            { header: "No.", width: 5, format: "int" },
            { header: "Date", width: 11 },
            { header: "Type", width: 18 },
            { header: "Component", width: 16 },
            { header: "Injected", width: 10 },
            { header: "Removed", width: 10 },
            { header: "Fix (min)", width: 8, format: "int" },
            { header: "Fix ref.", width: 7, format: "int" },
            { header: "Description", width: 36 },
            { header: "Entered", width: 16 },
          ],
          rows: rows.map(({ m, r }) => [m.name, r.number, r.date, defectTypeLabel(r.type), r.componentName, r.phaseInjected, r.phaseRemoved, r.fixTimeMin, r.fixRefNumber, r.description, myt(r.createdAt)]),
        },
      ];
    }
    case "LOGAI": {
      const rows = (await Promise.all(ctx.members.map((m) => listAiLogs(m.id, w1)))).flat();
      return [
        {
          title: t,
          columns: [
            { header: "Author", width: 18 },
            { header: "Code", width: 8 },
            { header: "Date", width: 11 },
            { header: "Module", width: 14 },
            { header: "Tool / model", width: 16 },
            { header: "Prompt / spec", width: 30 },
            { header: "Output summary", width: 30 },
            { header: "Human refinement", width: 26 },
            { header: "Test evidence", width: 22 },
            { header: "PR", width: 20 },
            { header: "Reviewer", width: 16 },
            { header: "Approved", width: 9 },
          ],
          rows: rows.map((r) => [r.authorName, r.code, r.date, r.module, [r.tool, r.model].filter(Boolean).join(" / "), r.promptSpec, r.outputSummary, r.humanRefinement, r.testEvidence, r.prUrl, r.reviewerName, r.approved]),
        },
      ];
    }
    case "PEER": {
      if (!ctx.includePeer) return [];
      const rows = await db.peerEvaluation.findMany({
        where: { evaluatorId: { in: ctx.members.map((m) => m.id) } },
        include: { milestone: { select: { code: true, dueAt: true } } },
        orderBy: [{ milestone: { dueAt: "asc" } }],
      });
      const name = (id: string) => ctx.members.find((m) => m.id === id)?.name ?? "Former member";
      return [
        {
          title: t,
          notes: ["Private: visible only to the author and the lecturer."],
          columns: [
            { header: "Milestone", width: 8 },
            { header: "Evaluator", width: 18 },
            { header: "Evaluatee", width: 18 },
            ...PEER_CRITERIA.map((c) => ({ header: c.label, width: 7, format: "int" as const })),
            { header: "Total /50", width: 7, format: "int" },
            { header: "Submitted", width: 16 },
            { header: "Comment", width: 30 },
          ],
          rows: rows
            .sort((a, b) => a.milestone.dueAt.getTime() - b.milestone.dueAt.getTime() || name(a.evaluatorId).localeCompare(name(b.evaluatorId)))
            .map((r) => {
              const s = r.scores as Record<string, number>;
              return [r.milestone.code, name(r.evaluatorId), r.evaluateeId === r.evaluatorId ? `${name(r.evaluateeId)} (self)` : name(r.evaluateeId), ...PEER_CRITERIA.map((c) => s[c.key] ?? null), peerTotal(s), myt(r.submittedAt) ?? "Draft", r.comment];
            }),
        },
      ];
    }
    case "TASK": {
      const p = ctx.planning;
      return [
        {
          title: t,
          notes: [`Total plan hours ${p.schedule.totalTaskPlanHours} · schedule hours ${p.schedule.totalSchedulePlanHours}.`],
          columns: [
            { header: "#", width: 4, format: "int" },
            { header: "Task", width: 28 },
            { header: "Phase", width: 9 },
            { header: "Component", width: 14 },
            { header: "Assignee", width: 16 },
            { header: "Size", width: 7, format: "dec" },
            { header: "Measure", width: 8 },
            { header: "Plan h", width: 7, format: "dec" },
            { header: "PV", width: 7, format: "pct" },
            { header: "Cum PV", width: 7, format: "pct" },
            { header: "Plan week", width: 7, format: "int" },
            { header: "Actual h", width: 7, format: "dec" },
            { header: "Completed", width: 11 },
            { header: "EV", width: 7, format: "pct" },
          ],
          rows: p.tasks.map((x, i) => [i + 1, x.name, x.phase, x.componentName, x.assigneeName, x.estSize, x.sizeMeasure, x.planHours, x.planValue, x.cumPlanValue, x.planWeek, x.actualHours, x.completedOn, x.earnedValue]),
        },
      ];
    }
    case "SCHEDULE": {
      const p = ctx.planning;
      return [
        {
          title: `${t} (team)`,
          notes: [`Current week ${p.currentWeek}. Predicted values start after the current week.`],
          columns: [
            { header: "Week", width: 6, format: "int" },
            { header: "Plan h", width: 8, format: "dec" },
            { header: "Cum plan h", width: 9, format: "dec" },
            { header: "Actual h", width: 8, format: "dec" },
            { header: "Cum actual h", width: 9, format: "dec" },
            { header: "PV", width: 7, format: "pct" },
            { header: "Cum PV", width: 7, format: "pct" },
            { header: "EV", width: 7, format: "pct" },
            { header: "Cum EV", width: 7, format: "pct" },
            { header: "Pred. cum h", width: 9, format: "dec" },
            { header: "Pred. cum EV", width: 9, format: "pct" },
          ],
          rows: p.schedule.weeks.map((w) => {
            const future = w.week > p.currentWeek;
            return [w.week, w.planHours, w.cumPlanHours, future ? null : w.actualHours, future ? null : w.cumActualHours, w.plannedValue, w.cumPlannedValue, future ? null : w.earnedValue, future ? null : w.cumEarnedValue, w.cumPredictedHours, w.cumPredictedEarnedValue];
          }),
        },
        {
          title: `${t} (per member)`,
          columns: [{ header: "Member", width: 20 }, ...p.weeks.map((w) => ({ header: `W${w}`, width: 5, format: "dec" as const })), { header: "Total", width: 7, format: "dec" }],
          rows: p.scheduleGrid.map((g) => [g.name + (g.active ? "" : " (left)"), ...p.weeks.map((w) => g.hours[w] ?? 0), p.weeks.reduce((s, w) => s + (g.hours[w] ?? 0), 0)]),
        },
      ];
    }
    case "SUMTASK": {
      const s = ctx.planning.sumtask;
      const group = (label: string, gs: typeof s.byMember): Section => ({
        title: `${t} by ${label}`,
        columns: [
          { header: label[0]!.toUpperCase() + label.slice(1), width: 20 },
          { header: "Tasks", width: 6, format: "int" },
          { header: "Done", width: 6, format: "int" },
          { header: "Overdue", width: 7, format: "int" },
          { header: "Plan h", width: 8, format: "dec" },
          { header: "Actual h", width: 8, format: "dec" },
          { header: "PV", width: 7, format: "pct" },
          { header: "EV", width: 7, format: "pct" },
          { header: "CPI", width: 6, format: "dec" },
        ],
        rows: [...gs, s.total].map((g) => [g.label, g.tasks, g.done, g.overdue, g.planHours, g.actualHours, g.plannedValue, g.earnedValue, g.cpi]),
      });
      return [
        {
          title: t,
          notes: [`LOGT hours not linked to a task: ${s.unlinkedTotal.toFixed(2)} h.`],
          columns: [
            { header: "Task", width: 26 },
            { header: "Phase", width: 9 },
            { header: "Assignee", width: 16 },
            { header: "Plan h", width: 7, format: "dec" },
            { header: "Actual h", width: 7, format: "dec" },
            { header: "Deviation h", width: 8, format: "dec" },
            { header: "Deviation", width: 8, format: "pct" },
            { header: "CPI", width: 6, format: "dec" },
            { header: "Plan wk", width: 6, format: "int" },
            { header: "Done wk", width: 6, format: "int" },
            { header: "Weeks late", width: 6, format: "int" },
            { header: "Status", width: 10 },
          ],
          rows: s.rows.map((r) => [r.name, r.phase, r.assigneeName, r.planHours, r.actualHours, r.deviationHours, r.deviationPct, r.cpi, r.planWeek, r.completedWeek, r.weeksLate, r.status.replace("_", " ")]),
        },
        group("member", s.byMember),
        group("phase", s.byPhase),
        group("component", s.byComponent),
      ];
    }
    case "LOGTEST": {
      const rows = await listTests(ctx.teamId, w1);
      const executed = rows.filter((r) => r.status === "PASS" || r.status === "FAIL");
      return [
        {
          title: t,
          notes: [`${rows.length} test cases; ${executed.length} executed; pass rate ${executed.length ? `${Math.round((executed.filter((r) => r.status === "PASS").length / executed.length) * 100)}%` : "—"}.`],
          columns: [
            { header: "ID", width: 8 },
            { header: "Date", width: 11 },
            { header: "Module", width: 14 },
            { header: "Description", width: 30 },
            { header: "Type", width: 10 },
            { header: "Expected", width: 22 },
            { header: "Actual", width: 22 },
            { header: "Status", width: 9 },
            { header: "Author", width: 16 },
          ],
          rows: rows.map((r) => [r.testCode, r.date, r.module, r.description, r.type, r.expected, r.actual, r.status, r.authorName]),
        },
      ];
    }
    case "WEEK": {
      const p = ctx.planning;
      const weeks = reportWeeks(p.currentWeek, p.semester.weekCount, p.semester.breakWeeks);
      const stored = await db.weeklyReport.findMany({ where: { teamId: ctx.teamId } });
      return [
        {
          title: t,
          notes: ["Figures are frozen at submission; open reports show live figures."],
          columns: [
            { header: "Week", width: 5, format: "int" },
            { header: "Due", width: 15 },
            { header: "Status", width: 9 },
            { header: "Submitted", width: 15 },
            { header: "Plan h (wk)", width: 7, format: "dec" },
            { header: "Actual h (wk)", width: 7, format: "dec" },
            { header: "Cum plan h", width: 7, format: "dec" },
            { header: "Cum actual h", width: 7, format: "dec" },
            { header: "Cum PV", width: 7, format: "pct" },
            { header: "Cum EV", width: 7, format: "pct" },
            { header: "Tasks completed", width: 26 },
            { header: "Risks and issues", width: 26 },
            { header: "Next week's plan", width: 26 },
          ],
          rows: weeks.map((w) => {
            const r = stored.find((x) => x.week === w);
            const due = weekReportDueAt(w, p.semester.week1Monday);
            const fig = (r?.submittedAt && (r.snapshot as WeekReport | null)) || computeWeek(p, w);
            return [
              w,
              myt(due),
              submissionStatus(r?.submittedAt ?? null, due, ctx.now),
              myt(r?.submittedAt),
              fig.scheduleHours.thisWeek.plan,
              fig.scheduleHours.thisWeek.actual,
              fig.scheduleHours.toDate.plan,
              fig.scheduleHours.toDate.actual,
              fig.earnedValue.toDate.plan,
              fig.earnedValue.toDate.actual,
              r?.tasksCompleted,
              r?.risksIssues,
              r?.nextWeekPlan,
            ];
          }),
        },
      ];
    }
    case "SUMS": {
      const s = await loadSums(ctx.teamId);
      const sizeCols = (side: string) =>
        ["B", "D", "M", "A", "R", "NR", "N&C", "Total"].map((h) => ({ header: `${side} ${h}`, width: 6, format: "int" as const }));
      const vals = (x: (typeof s.rows)[number]["plan"]) => [x.base, x.deleted, x.modified, x.added, x.reused, x.newReuse, x.newAndChanged, x.total];
      return [
        {
          title: t,
          notes: [`Not assigned to a component: ${s.unassigned.hours} h, ${s.unassigned.defects} defects.`],
          columns: [{ header: "Component", width: 18 }, { header: "Parent", width: 14 }, { header: "Measure", width: 7 }, ...sizeCols("Plan"), ...sizeCols("Actual"), { header: "Plan h", width: 6, format: "dec" }, { header: "Actual h", width: 6, format: "dec" }, { header: "Defects", width: 6, format: "int" }],
          rows: s.rows.map((r) => [r.name, r.parentName, r.sizeMeasure, ...vals(r.plan), ...vals(r.actual), r.planHours, r.actualHours, r.defectsInjected]),
        },
      ];
    }
    case "SUMP": {
      const { sump } = await loadSumpSumq(ctx.teamId, null);
      const phaseSection = (label: string, rows: typeof sump.time, total: { plan: number; actual: number }, fmt: "dec" | "int"): Section => ({
        title: `${t} ${label}`,
        columns: [{ header: "Phase", width: 12 }, { header: "Plan", width: 8, format: fmt }, { header: "Actual", width: 8, format: fmt }, { header: "Actual %", width: 8, format: "pct" }],
        rows: [...rows.map((r) => [r.phase, r.plan, r.actual, r.actualPct]), ["Total", total.plan, total.actual, null]],
      });
      const sum = sump.summary;
      return [
        {
          title: `${t} summary (SYSTEM)`,
          columns: [{ header: "Measure", width: 22 }, { header: "Plan", width: 10, format: "dec" }, { header: "Actual", width: 10, format: "dec" }],
          rows: [
            ["LOC new & changed", sump.size.plan.loc.newAndChanged, sump.size.actual.loc.newAndChanged],
            ["LOC total", sump.size.plan.loc.total, sump.size.actual.loc.total],
            ["LOC / hour", sum.locPerHour.plan, sum.locPerHour.actual],
            ["CPI (plan h / actual h)", sum.cpi.plan, sum.cpi.actual],
            ["% reused", sum.reusePct.plan, sum.reusePct.actual],
            ["% new reuse", sum.newReusePct.plan, sum.newReusePct.actual],
          ],
        },
        phaseSection("time in phase (h)", sump.time, sump.timeTotal, "dec"),
        phaseSection("defects injected", sump.injected, sump.injectedTotal, "dec"),
        phaseSection("defects removed", sump.removed, sump.removedTotal, "dec"),
      ];
    }
    case "SUMQ": {
      const { sumq } = await loadSumpSumq(ctx.teamId, null);
      const rows = (group: string, items: readonly { label?: string; phase?: string; plan?: number | null; actual: number | null }[]) =>
        items.map((x) => [group, x.label ?? x.phase ?? "", x.plan ?? null, x.actual]);
      return [
        {
          title: `${t} (SYSTEM)`,
          notes: ["Ratios with a zero denominator are shown as —."],
          columns: [{ header: "Group", width: 18 }, { header: "Measure", width: 30 }, { header: "Plan", width: 10, format: "dec" }, { header: "Actual", width: 10, format: "dec" }],
          rows: [
            ...rows("Percent defect free", sumq.percentDefectFree),
            ...rows("Defects / page", sumq.defectsPerPage),
            ...rows("Defects / KLOC", sumq.defectsPerKloc),
            ...rows("Defect ratios", sumq.defectRatios),
            ...rows("Development time ratios", sumq.timeRatios),
            ...rows("Review rates", sumq.reviewRates),
            ["A/FR", "Appraisal / failure ratio", sumq.afr.plan, sumq.afr.actual],
            ...rows("Phase yields", sumq.phaseYields),
            ...rows("Process yields", sumq.processYields),
            ...rows("Injection rate (/h)", sumq.injectionRates),
            ...rows("Removal rate (/h)", sumq.removalRates),
          ],
        },
      ];
    }
    case "CCR": {
      const rows = await listChangeRequests(ctx.teamId);
      return [
        {
          title: t,
          columns: [
            { header: "No.", width: 5, format: "int" },
            { header: "Date", width: 11 },
            { header: "Requester", width: 16 },
            { header: "Component", width: 14 },
            { header: "Description", width: 30 },
            { header: "Reason", width: 22 },
            { header: "Impact", width: 22 },
            { header: "Priority", width: 8 },
            { header: "Status", width: 11 },
            { header: "Decided by", width: 16 },
            { header: "Decided at", width: 15 },
          ],
          rows: rows.map((r) => [r.number, r.date, r.requesterName, r.componentName, r.description, r.reason, r.impact, r.priority, r.status, r.decidedByName, myt(r.decidedAt)]),
        },
      ];
    }
  }
}

export const today = (now: Date) => formatDateOnly(new Date(now.getTime() + 8 * 3600_000));
