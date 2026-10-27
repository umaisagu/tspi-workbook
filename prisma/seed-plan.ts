/**
 * Development seed: TASK and SCHEDULE for a team, built from a template of TSPi tasks.
 * Completion follows the plan, except for the inactive member (stops after week 4) and the
 * low-effort member (finishes about half of their tasks).
 */
import type { Phase, PrismaClient } from "../generated/prisma/client";
import { planTasks } from "../lib/tsp/earned-value";
import { localDate, weekStart } from "../lib/tsp/calendar";
import { rng, type SeedMember } from "./seed-logs";

interface TaskTemplate {
  name: string;
  phase: Phase;
  hours: number;
  who: SeedMember["focus"] | "owner";
  component: "doc" | number | null;
}

function template(codeComponents: number): TaskTemplate[] {
  const t: TaskTemplate[] = [
    { name: "Launch and strategy meeting", phase: "STRAT", hours: 6, who: "lead", component: null },
    { name: "Project plan: TASK and SCHEDULE", phase: "PLAN", hours: 8, who: "plan", component: "doc" },
    { name: "Client requirements elicitation", phase: "REQ", hours: 10, who: "plan", component: "doc" },
    { name: "SRS draft with FR-IDs", phase: "REQ", hours: 10, who: "lead", component: "doc" },
    { name: "System test plan", phase: "STP", hours: 6, who: "qa", component: "doc" },
    { name: "SRS inspection", phase: "REQINSP", hours: 4, who: "qa", component: "doc" },
    { name: "Proposal and M1 package", phase: "DOC", hours: 6, who: "support", component: "doc" },
    { name: "High-level design (SDS, UML, ERD)", phase: "HLD", hours: 10, who: "dev", component: "doc" },
    { name: "HLD inspection", phase: "HLDINSP", hours: 4, who: "qa", component: "doc" },
  ];
  for (let c = 0; c < codeComponents; c++) {
    t.push(
      { name: "Detailed design", phase: "DLD", hours: 4, who: "dev", component: c },
      { name: "Code", phase: "CODE", hours: 10, who: "owner", component: c },
      { name: "Code review", phase: "CR", hours: 3, who: "dev", component: c },
      { name: "Unit and widget tests", phase: "UT", hours: 5, who: "qa", component: c },
    );
  }
  t.push(
    { name: "Integration tests", phase: "IT", hours: 8, who: "qa", component: null },
    { name: "System test and UAT with client", phase: "ST", hours: 8, who: "qa", component: null },
    { name: "README and user manual", phase: "DOC", hours: 8, who: "support", component: "doc" },
    { name: "Weekly meetings and WEEK reports", phase: "MGMT", hours: 10, who: "lead", component: null },
    { name: "Postmortem", phase: "PM", hours: 3, who: "lead", component: null },
  );
  return t;
}

/** Planned hours per week by profile (the plan; actual logging differs by profile in seed-logs). */
const PLAN_HOURS: Record<SeedMember["profile"], number> = { normal: 5, high: 6, low: 4, inactive: 5, backfill: 5 };

export async function seedPlan(
  db: PrismaClient,
  opts: {
    teamId: string;
    members: SeedMember[];
    components: { id: string; name: string; code: boolean; ownerMembershipId: string | null }[];
    week1: Date;
    weekCount: number;
    breakWeeks: number[];
    seed: number;
  },
) {
  const r = rng(opts.seed);
  const today = localDate(new Date());
  const currentWeek = Math.floor((today.getTime() - opts.week1.getTime()) / (7 * 86400000)) + 1;
  const doc = opts.components.find((c) => !c.code)!;
  const code = opts.components.filter((c) => c.code);
  const byFocus = (f: SeedMember["focus"]) => opts.members.filter((m) => m.focus === f);
  const leader = opts.members[0]!;
  const audit = { createdById: leader.userId, updatedById: leader.userId };

  // TASK rows
  const tmpl = template(code.length);
  let devTurn = 0;
  const rows = tmpl.map((t, i) => {
    const component = t.component === "doc" ? doc : t.component === null ? null : code[t.component]!;
    let assignee: SeedMember;
    if (t.who === "owner") assignee = opts.members.find((m) => m.membershipId === component?.ownerMembershipId) ?? leader;
    else {
      const pool = byFocus(t.who);
      assignee = pool.length ? pool[devTurn++ % pool.length]! : leader;
    }
    const label = component && component !== doc && t.component !== null ? `${t.name}: ${component.name}` : t.name;
    return { order: i + 1, name: label, phase: t.phase, hours: t.hours, componentId: component?.id ?? null, assignee };
  });
  // SCHEDULE: weeks 3..weekCount except breaks, at each member's planned weekly hours.
  const planWeeks = Array.from({ length: opts.weekCount }, (_, i) => i + 1).filter((w) => w >= 3 && !opts.breakWeeks.includes(w));
  const scheduleTotal = opts.members.reduce((s, m) => s + PLAN_HOURS[m.profile], 0) * planWeeks.length;
  // Task hours scaled so the task plan uses ~95% of the scheduled hours.
  const templateTotal = rows.reduce((s, t) => s + t.hours, 0);
  for (const t of rows) t.hours = Math.max(1, Math.round(((t.hours * scheduleTotal * 0.95) / templateTotal) * 2) / 2);
  const schedule = new Map<number, number>();
  for (const m of opts.members) {
    const hours = PLAN_HOURS[m.profile];
    for (const w of planWeeks) {
      await db.scheduleWeek.create({ data: { teamId: opts.teamId, membershipId: m.membershipId, week: w, planHours: hours, ...audit } });
      schedule.set(w, (schedule.get(w) ?? 0) + hours);
    }
  }

  // Plan weeks, then completion following the plan.
  const planned = planTasks(
    rows.map((t, i) => ({ id: String(i), order: t.order, planHours: t.hours, completedWeek: null })),
    schedule,
  );
  const created: { id: string; phase: Phase; planWeek: number | null; assigneeId: string }[] = [];
  for (const [i, t] of rows.entries()) {
    const planWeek = planned[i]!.planWeek;
    let completedOn: Date | null = null;
    if (planWeek !== null && planWeek <= currentWeek) {
      const skip =
        (t.assignee.profile === "inactive" && planWeek > 4) || (t.assignee.profile === "low" && r() < 0.5) || (planWeek === currentWeek && r() < 0.6);
      if (!skip) {
        const slip = r() < 0.25 ? 1 : 0;
        let week = planWeek + slip;
        if (opts.breakWeeks.includes(week)) week++;
        const day = new Date(weekStart(week, opts.week1).getTime() + Math.floor(r() * 5) * 86400000);
        completedOn = day > today ? (planWeek < currentWeek ? today : null) : day;
      }
    }
    const task = await db.task.create({
      data: {
        teamId: opts.teamId,
        order: t.order,
        name: t.name,
        phase: t.phase,
        componentId: t.componentId,
        assigneeMembershipId: t.assignee.membershipId,
        planHours: t.hours,
        ...(t.phase === "CODE" ? { estSize: t.hours * 40, sizeMeasure: "LOC" as const, rate: 40 } : {}),
        completedOn,
        ...audit,
      },
    });
    created.push({ id: task.id, phase: t.phase, planWeek, assigneeId: t.assignee.membershipId });
  }
  return created;
}
