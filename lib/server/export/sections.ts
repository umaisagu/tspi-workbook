import "server-only";
import type { FormType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import type { Section } from "@/lib/export/document";
import { FORM_INFO } from "@/lib/forms";
import { defectTypeLabel } from "@/lib/tsp/defects";
import { PEER_CRITERIA, peerTotal } from "@/lib/tsp/peer";
import { TSPI_ROLES } from "@/lib/tsp/roles";
import { taskStatusLabel } from "@/lib/tsp/tasks";
import { keepRate, verdictLabel } from "@/lib/tsp/ai-log";
import { formatDateOnly } from "@/lib/tsp/calendar";
import { WEEK_STATUS_LABELS, reportWeeks, submissionStatus, weekReportDueAt, weekStatus, type WeekReport } from "@/lib/tsp/week";
import { listAiLogs, listDefectLogs, listTimeLogs } from "@/lib/server/forms/logs";
import { loadPlanning, type Planning } from "@/lib/server/forms/planning";
import { loadPersonalSummary } from "@/lib/server/forms/personal";
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
export const EXPORT_FORMS: FormType[] = ["SI", "LOGT", "LOGD", "LOGAI", "PEER", "MYSUM", "TASK", "SCHEDULE", "SUMTASK", "LOGTEST", "WEEK", "SUMS", "SUMP", "SUMQ", "CCR"];

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
            { header: "AI used?", width: 6 },
            { header: "Comments", width: 30 },
            { header: "Entered", width: 16 },
          ],
          rows: rows.map(({ m, r }) => [m.name, r.date, r.week, r.start, r.stop, r.interruptMin, r.deltaMin, r.phase, r.componentName, r.taskName, r.aiUsed, r.comments, myt(r.createdAt)]),
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
            { header: "Severity", width: 8 },
            { header: "From AI?", width: 6 },
            { header: "Fix reference", width: 12 },
            { header: "Injected while fixing no.", width: 7, format: "int" },
            { header: "Description & root cause", width: 36 },
            { header: "Entered", width: 16 },
          ],
          rows: rows.map(({ m, r }) => [m.name, r.number, r.date, defectTypeLabel(r.type), r.componentName, r.phaseInjected, r.phaseRemoved, r.fixTimeMin, r.severity.charAt(0) + r.severity.slice(1).toLowerCase(), r.fromAi, r.fixReference, r.fixRefNumber, r.description, myt(r.createdAt)]),
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
            { header: "File / module", width: 14 },
            { header: "Feature", width: 22 },
            { header: "AI tool", width: 12 },
            { header: "Prompt (summarised)", width: 30 },
            { header: "Lines gen.", width: 7, format: "int" },
            { header: "Lines kept", width: 7, format: "int" },
            { header: "Keep %", width: 7, format: "pct" },
            { header: "Reviewer", width: 16 },
            { header: "Verdict", width: 14 },
            { header: "Tests?", width: 6 },
            { header: "Test status", width: 8 },
            { header: "Commit / PR", width: 14 },
            { header: "Approved?", width: 7 },
            { header: "Notes (before v3.0)", width: 30 },
          ],
          rows: rows.map((r) => [
            r.authorName,
            r.code,
            r.date,
            r.module,
            r.feature,
            r.tool,
            r.promptSpec,
            r.linesGenerated,
            r.linesKept,
            keepRate(r.linesGenerated, r.linesKept),
            r.reviewerName,
            verdictLabel(r.verdict),
            r.testsWritten,
            r.testStatus,
            r.commitRef ?? r.prUrl,
            r.approved,
            [r.model, r.outputSummary, r.humanRefinement, r.testEvidence].filter(Boolean).join(" · "),
          ]),
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
            { header: "Task ID", width: 7 },
            { header: "M/stone", width: 6 },
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
            { header: "Status", width: 10 },
            { header: "Completed", width: 11 },
            { header: "EV", width: 7, format: "pct" },
          ],
          rows: p.tasks.map((x) => [x.code, x.milestoneCode, x.name, x.phase, x.componentName, x.assigneeName, x.estSize, x.sizeMeasure, x.planHours, x.planValue, x.cumPlanValue, x.planWeek, x.actualHours, taskStatusLabel(x.status), x.completedOn, x.earnedValue]),
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
            { header: "Tester", width: 16 },
            { header: "Defect ref", width: 8 },
            { header: "Automated?", width: 7 },
          ],
          rows: rows.map((r) => [r.testCode, r.date, r.module, r.description, r.type, r.expected, r.actual, r.status, r.authorName, r.defectRef, r.automated]),
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
            { header: "EV variance", width: 7, format: "pct" },
            { header: "Week status", width: 9 },
            { header: "Met?", width: 5 },
            { header: "Present", width: 6, format: "int" },
            { header: "Biggest risk or issue", width: 26 },
            { header: "Commitment for next week", width: 26 },
            { header: "Tasks completed (notes)", width: 26 },
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
              fig.earnedValue.toDate.actual - fig.earnedValue.toDate.plan,
              WEEK_STATUS_LABELS[weekStatus(fig.earnedValue.toDate.actual - fig.earnedValue.toDate.plan)],
              r?.met ?? null,
              r?.present ?? null,
              r?.risksIssues,
              r?.nextWeekPlan,
              r?.tasksCompleted,
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
      const z = sump.size;
      return [
        {
          title: `${t} program size and summary (SYSTEM)`,
          columns: [{ header: "Measure", width: 26 }, { header: "Plan", width: 10, format: "dec" }, { header: "Actual", width: 10, format: "dec" }],
          rows: [
            ["Requirements pages (SRS)", z.srsPages.plan, z.srsPages.actual],
            ["Design pages (SDD)", z.sddPages.plan, z.sddPages.actual],
            ["New & changed Dart LOC (N)", z.newAndChanged.plan, z.newAndChanged.actual],
            ["Total Dart LOC (T)", z.total.plan, z.total.actual],
            ["Reused Dart LOC (R)", z.reused.plan, z.reused.actual],
            ["Screens delivered", z.screens.plan, z.screens.actual],
            ["Reusable widgets built", z.widgets.plan, z.widgets.actual],
            ["LOC per hour", sum.locPerHour.plan, sum.locPerHour.actual],
            ["CPI (plan h / actual h)", sum.cpi.plan, sum.cpi.actual],
            ["Defects per KLOC (development)", sum.defectsPerKloc.plan, sum.defectsPerKloc.actual],
            ["Hours per defect removed", sum.hoursPerDefect.plan, sum.hoursPerDefect.actual],
            ["% of code AI-assisted", null, sum.aiShare.actual],
            ["Defects traced to AI code", null, sum.defectsFromAi],
            ["Client acceptance defects", null, sum.acceptanceDefects],
          ],
        },
        phaseSection("time in phase (h)", sump.time, sump.timeTotal, "dec"),
        phaseSection("defects injected", sump.injected, sump.injectedTotal, "dec"),
        phaseSection("defects removed", sump.removed, sump.removedTotal, "dec"),
        {
          title: `${t} after development`,
          columns: [{ header: "", width: 30 }, { header: "Plan", width: 8, format: "dec" }, { header: "Actual", width: 8, format: "int" }],
          rows: [
            ["UAT injected", null, sump.injectedLater.uat],
            ["PL injected", null, sump.injectedLater.pl],
            ["UAT removed", sump.removedLater.uat.plan, sump.removedLater.uat.actual],
            ["PL removed", sump.removedLater.pl.plan, sump.removedLater.pl.actual],
          ],
        },
      ];
    }
    case "SUMQ": {
      const { sumq } = await loadSumpSumq(ctx.teamId, null);
      const rows = (group: string, items: readonly { label?: string; phase?: string; plan?: number | null; actual: number | null }[]) =>
        items.map((x) => [group, x.label ?? x.phase ?? "", x.plan ?? null, x.actual, "", ""]);
      return [
        {
          title: `${t} (SYSTEM)`,
          notes: ["Ratios with a zero denominator are shown as —. Percentages are fractions (0.85 = 85%)."],
          columns: [
            { header: "Group", width: 18 },
            { header: "Measure", width: 30 },
            { header: "Plan", width: 9, format: "dec" },
            { header: "Actual", width: 9, format: "dec" },
            { header: "Guideline", width: 10 },
            { header: "Verdict", width: 8 },
          ],
          rows: [
            ...sumq.sections.flatMap((sec) => sec.rows.map((r) => [sec.title, r.label, r.plan, r.actual, r.guideline?.text ?? "", r.verdict ?? ""])),
            ...sumq.profile.map((a) => ["Quality profile", a.label, null, a.value, `target ${a.target}`, `${Math.round(a.score * 100)}%`]),
            ...rows("Percent defect free", sumq.percentDefectFree),
            ...rows("Injection rate (/h)", sumq.injectionRates),
          ],
        },
      ];
    }
    case "MYSUM": {
      const all = await Promise.all(ctx.members.map(async (m) => ({ m, s: await loadPersonalSummary(m.id) })));
      const labels = all[0]?.s.sumq.map((r) => r.label) ?? [];
      return [
        {
          title: `${t} — my measures (MYSUMQ)`,
          notes: ["Percentages are fractions (0.85 = 85%). — means no denominator yet."],
          columns: [{ header: "Measure", width: 30 }, ...all.map(({ m }) => ({ header: m.name, width: 12, format: "dec" as const }))],
          rows: labels.map((label) => [label, ...all.map(({ s }) => s.sumq.find((r) => r.label === label)?.actual ?? null)]),
        },
        {
          title: `${t} — time in phase (MYSUMP, h)`,
          columns: [
            { header: "Phase", width: 10 },
            ...all.flatMap(({ m }) => [
              { header: `${m.name} plan`, width: 9, format: "dec" as const },
              { header: `${m.name} actual`, width: 9, format: "dec" as const },
            ]),
          ],
          rows: (all[0]?.s.sump.time ?? []).map((r, i) => [r.phase, ...all.flatMap(({ s }) => [s.sump.time[i]?.plan ?? null, s.sump.time[i]?.actual ?? null])]),
        },
        {
          title: `${t} — size contribution (MYSUMP)`,
          columns: [
            { header: "Member", width: 20 },
            ...(all[0]?.s.sump.size ?? []).flatMap((x) => [
              { header: `${x.label} plan`, width: 10, format: "int" as const },
              { header: `${x.label} actual`, width: 10, format: "int" as const },
            ]),
          ],
          rows: all.map(({ m, s }) => [m.name, ...s.sump.size.flatMap((x) => [x.plan, x.actual])]),
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
            { header: "Change type", width: 11 },
            { header: "Component", width: 14 },
            { header: "What changes", width: 30 },
            { header: "Why", width: 22 },
            { header: "Est. h", width: 6, format: "dec" },
            { header: "M/stone", width: 6 },
            { header: "Reviewer", width: 16 },
            { header: "Impact", width: 22 },
            { header: "Priority", width: 8 },
            { header: "Decision", width: 11 },
            { header: "Notes", width: 22 },
            { header: "Decided by", width: 16 },
            { header: "Decided at", width: 15 },
          ],
          rows: rows.map((r) => [r.number, r.date, r.requesterName, r.changeType, r.componentName, r.description, r.reason, r.estHours, r.milestoneCode, r.reviewerName, r.impact, r.priority, r.status, r.notes, r.decidedByName, myt(r.decidedAt)]),
        },
      ];
    }
  }
}

export const today = (now: Date) => formatDateOnly(new Date(now.getTime() + 8 * 3600_000));
