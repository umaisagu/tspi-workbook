/**
 * Development seed: LOGTEST, WEEK, PEER and CCR for one team.
 * PEER is collected at M1 in the seed (the course defaults start at M2) so monitoring has ratings to show:
 * the low-effort member rates themselves far above what teammates give them, the backfilling member submits
 * late and the inactive member does not submit.
 */
import type { PrismaClient } from "../generated/prisma/client";
import { localDate, myTime, weekStart } from "../lib/tsp/calendar";
import { PEER_CRITERIA } from "../lib/tsp/peer";
import { reportWeeks, weekReportDueAt } from "../lib/tsp/week";
import { rng, type SeedComponent, type SeedMember } from "./seed-logs";

const TESTS = [
  { module: "FR-01 Login", description: "Valid e-mail and password signs the user in", type: "WIDGET", expected: "Home screen shown" },
  { module: "FR-01 Login", description: "Wrong password shows an error", type: "WIDGET", expected: "Error message, stays on login" },
  { module: "FR-01 Login", description: "Email validator rejects malformed addresses", type: "UNIT", expected: "Validator returns an error" },
  { module: "FR-03 Listing", description: "List shows items newest first", type: "WIDGET", expected: "Items sorted by date descending" },
  { module: "FR-03 Listing", description: "Empty state when no items", type: "WIDGET", expected: "Empty-state message shown" },
  { module: "FR-05 AI feature", description: "Service falls back when the API times out", type: "UNIT", expected: "Fallback result returned within 5 s" },
  { module: "FR-05 AI feature", description: "Mocked API success maps to a result model", type: "UNIT", expected: "Model fields populated" },
  { module: "Navigation", description: "Back from detail returns to the list", type: "WIDGET", expected: "List screen shown with scroll kept" },
  { module: "FR-02 Profile", description: "Profile form requires a name", type: "UNIT", expected: "Validation error for empty name" },
] as const;

export async function seedTeamForms(
  db: PrismaClient,
  opts: {
    teamId: string;
    members: SeedMember[];
    components: SeedComponent[];
    week1: Date;
    weekCount: number;
    breakWeeks: number[];
    m1: { id: string; dueAt: Date };
    lateWeekReports: boolean;
    seed: number;
  },
) {
  const r = rng(opts.seed);
  const now = new Date();
  const today = localDate(now);
  const currentWeek = Math.floor((today.getTime() - opts.week1.getTime()) / (7 * 86400000)) + 1;
  const leader = opts.members[0]!;
  const at = (d: Date) => (d > now ? now : d);
  const writers = opts.members.filter((m) => m.profile !== "inactive" && (m.focus === "qa" || m.focus === "dev"));

  // ----- LOGTEST (testing starts at Lab 04, week 6) -----
  if (currentWeek >= 6) {
    let n = 0;
    for (const t of TESTS) {
      const author = writers[n % writers.length] ?? leader;
      n++;
      const monday = weekStart(6, opts.week1).getTime();
      const days = Math.min(5, Math.floor((today.getTime() - monday) / 86400000) + 1);
      const date = new Date(monday + Math.floor(r() * days) * 86400000);
      const status = r() < 0.7 ? "PASS" : r() < 0.5 ? "FAIL" : "NOT_RUN";
      await db.testLog.create({
        data: {
          teamId: opts.teamId,
          authorMembershipId: author.membershipId,
          testCode: `TC-${String(n).padStart(3, "0")}`,
          ...t,
          actual: status === "PASS" ? t.expected : status === "FAIL" ? "Unexpected result; see defect log" : null,
          status,
          date,
          createdAt: at(myTime(date, 20, 0)),
          updatedAt: at(myTime(date, 20, 0)),
          createdById: author.userId,
          updatedById: author.userId,
        },
      });
    }
  }

  // ----- WEEK reports so far: one team submits on time (late if the deadline has passed), the other is behind -----
  for (const w of reportWeeks(currentWeek, opts.weekCount, opts.breakWeeks)) {
    const due = weekReportDueAt(w, opts.week1);
    const onTime = new Date(Math.min(due.getTime() - 20 * 3600 * 1000, now.getTime() - 3600 * 1000));
    // The "behind" team leaves the first report as a draft until after the deadline (late), or still a draft.
    const submittedAt = !opts.lateWeekReports ? onTime : due < now && w === 5 ? new Date(Math.min(due.getTime() + 26 * 3600 * 1000, now.getTime())) : null;
    if (w === currentWeek) continue;
    if (submittedAt && submittedAt.getTime() < weekStart(w, opts.week1).getTime()) continue;
    const stamp = submittedAt ?? new Date(now.getTime() - 2 * 3600 * 1000);
    await db.weeklyReport.create({
      data: {
        teamId: opts.teamId,
        week: w,
        tasksCompleted: "SRS draft finished and inspected; proposal submitted for M1.",
        risksIssues: "Client availability for the requirements walkthrough is limited to Saturdays.",
        nextWeekPlan: "Start the SDS (UML, ERD); set up CI; agree coding conventions.",
        submittedAt,
        submittedById: submittedAt ? leader.userId : null,
        createdAt: stamp,
        updatedAt: stamp,
        createdById: leader.userId,
        updatedById: leader.userId,
      },
    });
  }

  // ----- PEER at M1 -----
  if (opts.m1.dueAt <= now) {
    for (const evaluator of opts.members) {
      if (evaluator.profile === "inactive") continue;
      const submittedAt = evaluator.profile === "backfill" ? new Date(opts.m1.dueAt.getTime() + 30 * 3600 * 1000) : new Date(opts.m1.dueAt.getTime() - (2 + r() * 40) * 3600 * 1000);
      for (const evaluatee of opts.members) {
        const self = evaluatee.membershipId === evaluator.membershipId;
        const base = self && evaluatee.profile === "low" ? 5 : evaluatee.profile === "low" ? 2.4 : evaluatee.profile === "inactive" ? 2 : 4;
        const scores = Object.fromEntries(PEER_CRITERIA.map((c) => [c.key, Math.max(1, Math.min(5, Math.round(base + (r() - 0.5) * (self ? 0.6 : 1.2))))]));
        await db.peerEvaluation.create({
          data: {
            milestoneId: opts.m1.id,
            evaluatorId: evaluator.membershipId,
            evaluateeId: evaluatee.membershipId,
            scores,
            comment: !self && evaluatee.profile === "inactive" ? "Missed the last two meetings and did not reply in the group chat." : null,
            submittedAt: at(submittedAt),
            createdAt: at(submittedAt),
            updatedAt: at(submittedAt),
            createdById: evaluator.userId,
            updatedById: evaluator.userId,
          },
        });
      }
    }
  }

  // ----- CCR -----
  const code = opts.components.find((c) => c.role === "code");
  const requests = [
    { by: opts.members.find((m) => m.focus === "plan") ?? leader, week: 5, status: "APPROVED", description: "Add an offline cache so users can browse saved items without a connection.", reason: "Client feedback at the SRS walkthrough.", priority: "HIGH" },
    { by: opts.members.find((m) => m.focus === "dev") ?? leader, week: 6, status: "SUBMITTED", description: "Replace manual state handling with Riverpod providers.", reason: "Simplifies testing of the AI feature.", priority: "MEDIUM" },
  ] as const;
  let number = 0;
  for (const q of requests) {
    if (q.week > currentWeek) continue;
    number++;
    const date = new Date(weekStart(q.week, opts.week1).getTime() + 86400000);
    const created = at(myTime(date, 19, 0));
    await db.changeRequest.create({
      data: {
        teamId: opts.teamId,
        number,
        date: date > today ? today : date,
        requesterMembershipId: q.by.membershipId,
        componentId: code?.id ?? null,
        description: q.description,
        reason: q.reason,
        impact: "Requirements FR-03 and FR-05; about 6 extra hours of CODE and UT.",
        priority: q.priority,
        status: q.status,
        decidedById: q.status === "SUBMITTED" ? null : leader.userId,
        decidedAt: q.status === "SUBMITTED" ? null : at(new Date(created.getTime() + 86400000)),
        createdAt: created,
        updatedAt: created,
        createdById: q.by.userId,
        updatedById: q.by.userId,
      },
    });
  }
}
