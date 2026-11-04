import "server-only";
import type { Phase } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { computeMySump, computeMySumq, type PersonalInput } from "@/lib/tsp/personal";
import type { PhaseNumbers } from "@/lib/tsp/quality";

const add = (m: PhaseNumbers, p: Phase, n: number) => {
  m[p] = (m[p] ?? 0) + n;
};

/** MYSUMP + MYSUMQ for one member: own tasks, LOGT, LOGD, LOGTEST (as author), LOGAI and the typed size contribution. */
export async function loadPersonalSummary(membershipId: string) {
  const [tasks, logs, defects, tests, ai, size] = await Promise.all([
    db.task.findMany({ where: { assigneeMembershipId: membershipId, deletedAt: null }, select: { phase: true, planHours: true } }),
    db.timeLog.findMany({ where: { membershipId, deletedAt: null }, select: { phase: true, deltaMin: true } }),
    db.defectLog.findMany({ where: { membershipId, deletedAt: null }, select: { phaseInjected: true, phaseRemoved: true } }),
    db.testLog.findMany({ where: { authorMembershipId: membershipId, deletedAt: null }, select: { status: true } }),
    db.aiLog.findMany({ where: { membershipId, deletedAt: null }, select: { linesGenerated: true, linesKept: true, reviewerMembershipId: true } }),
    db.memberSize.findUnique({ where: { membershipId } }),
  ]);
  const input: PersonalInput = {
    planHours: {},
    actualHours: {},
    injected: {},
    removed: {},
    defects: defects.length,
    size: {
      planLoc: size?.planLoc ?? null,
      actLoc: size?.actLoc ?? null,
      planPages: size?.planPages ?? null,
      actPages: size?.actPages ?? null,
      planScreens: size?.planScreens ?? null,
      actScreens: size?.actScreens ?? null,
    },
    tests: { total: tests.length, pass: tests.filter((t) => t.status === "PASS").length },
    ai: {
      linesGenerated: ai.reduce((s, r) => s + (r.linesGenerated ?? 0), 0),
      linesKept: ai.reduce((s, r) => s + (r.linesKept ?? 0), 0),
      noReviewer: ai.filter((r) => !r.reviewerMembershipId).length,
      selfReviewed: ai.filter((r) => r.reviewerMembershipId === membershipId).length,
    },
  };
  for (const t of tasks) add(input.planHours, t.phase, Number(t.planHours));
  for (const l of logs) add(input.actualHours, l.phase, l.deltaMin / 60);
  for (const d of defects) {
    add(input.injected, d.phaseInjected, 1);
    add(input.removed, d.phaseRemoved, 1);
  }
  return { sump: computeMySump(input), sumq: computeMySumq(input) };
}
export type PersonalSummary = Awaited<ReturnType<typeof loadPersonalSummary>>;
