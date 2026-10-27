import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { formatDateOnly, weekOf } from "@/lib/tsp/calendar";
import { formatClock } from "@/lib/tsp/time";

/** Plain, serialisable rows for the form pages and API responses. */

export async function listTimeLogs(membershipId: string, week1Monday: Date) {
  const rows = await db.timeLog.findMany({
    where: { membershipId, deletedAt: null },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
    include: { component: { select: { name: true } }, task: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    date: formatDateOnly(r.date),
    week: weekOf(r.date, week1Monday),
    start: formatClock(r.startMin),
    stop: formatClock(r.stopMin),
    interruptMin: r.interruptMin,
    deltaMin: r.deltaMin,
    phase: r.phase,
    componentId: r.componentId,
    componentName: r.component?.name ?? null,
    taskId: r.taskId,
    taskName: r.task?.name ?? null,
    comments: r.comments,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
export type TimeLogRow = Awaited<ReturnType<typeof listTimeLogs>>[number];

export async function listDefectLogs(membershipId: string, week1Monday: Date) {
  const rows = await db.defectLog.findMany({
    where: { membershipId, deletedAt: null },
    orderBy: { number: "asc" },
    include: { component: { select: { name: true } }, fixRef: { select: { number: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    date: formatDateOnly(r.date),
    week: weekOf(r.date, week1Monday),
    number: r.number,
    type: r.type,
    componentId: r.componentId,
    componentName: r.component?.name ?? null,
    phaseInjected: r.phaseInjected,
    phaseRemoved: r.phaseRemoved,
    fixTimeMin: r.fixTimeMin,
    fixRefId: r.fixRefId,
    fixRefNumber: r.fixRef?.number ?? null,
    description: r.description,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
export type DefectLogRow = Awaited<ReturnType<typeof listDefectLogs>>[number];

const aiInclude = {
  reviewer: { include: { user: { select: { name: true } } } },
  membership: { include: { user: { select: { name: true } } } },
} as const;

function aiRow(
  r: Prisma.AiLogGetPayload<{ include: typeof aiInclude }>,
  week1Monday: Date,
) {
  return {
    id: r.id,
    code: r.code,
    date: formatDateOnly(r.date),
    week: weekOf(r.date, week1Monday),
    module: r.module,
    tool: r.tool,
    model: r.model,
    promptSpec: r.promptSpec,
    outputSummary: r.outputSummary,
    humanRefinement: r.humanRefinement,
    testEvidence: r.testEvidence,
    prUrl: r.prUrl,
    reviewerMembershipId: r.reviewerMembershipId,
    reviewerName: r.reviewer?.user.name ?? null,
    authorMembershipId: r.membershipId,
    authorName: r.membership.user.name,
    approved: r.approved,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function listAiLogs(membershipId: string, week1Monday: Date) {
  const rows = await db.aiLog.findMany({ where: { membershipId, deletedAt: null }, orderBy: { code: "asc" }, include: aiInclude });
  return rows.map((r) => aiRow(r, week1Monday));
}

/** Entries other members asked this member to review. */
export async function listAiReviewRequests(reviewerMembershipId: string, week1Monday: Date) {
  const rows = await db.aiLog.findMany({
    where: { reviewerMembershipId, deletedAt: null },
    orderBy: [{ approved: "asc" }, { date: "desc" }],
    include: aiInclude,
  });
  return rows.map((r) => aiRow(r, week1Monday));
}
export type AiLogRow = Awaited<ReturnType<typeof listAiLogs>>[number];

export async function listComponents(teamId: string) {
  const rows = await db.component.findMany({
    where: { teamId, deletedAt: null },
    orderBy: { name: "asc" },
    include: { owner: { include: { user: { select: { name: true } } } }, parent: { select: { name: true } } },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    parentId: c.parentId,
    parentName: c.parent?.name ?? null,
    ownerMembershipId: c.ownerMembershipId,
    ownerName: c.owner?.user.name ?? null,
  }));
}
export type ComponentRow = Awaited<ReturnType<typeof listComponents>>[number];

export async function listTaskOptions(teamId: string) {
  const rows = await db.task.findMany({ where: { teamId, deletedAt: null }, orderBy: { order: "asc" }, select: { id: true, name: true, phase: true } });
  return rows;
}

export async function listTeammates(teamId: string) {
  const rows = await db.membership.findMany({
    where: { teamId, leftAt: null },
    orderBy: { joinedAt: "asc" },
    include: { user: { select: { name: true } } },
  });
  return rows.map((m) => ({ membershipId: m.id, name: m.user.name }));
}
