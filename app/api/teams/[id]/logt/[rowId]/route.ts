import { db } from "@/lib/db";
import { timeLogSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireIndividualForm } from "@/lib/server/forms/access";
import { assertComponent, assertNoOverlap, assertTask, logDate } from "@/lib/server/forms/refs";
import { notFound, ok, parseJson, route } from "@/lib/server/http";
import { deltaMinutes, parseClock } from "@/lib/tsp/time";

async function ownRow(teamId: string, rowId: string) {
  const ctx = await requireIndividualForm(teamId, null, "LOGT", "write");
  const row = await db.timeLog.findFirst({ where: { id: rowId, membershipId: ctx.ownerMembershipId, deletedAt: null } });
  if (!row) throw notFound("Entry");
  return ctx;
}

export const PATCH = route(async (req, { params }: RouteContext<"/api/teams/[id]/logt/[rowId]">) => {
  const { id, rowId } = await params;
  const ctx = await ownRow(id, rowId);
  const input = await parseJson(req, timeLogSchema);
  await assertComponent(id, input.componentId);
  await assertTask(id, input.taskId);
  const startMin = parseClock(input.start)!;
  const stopMin = parseClock(input.stop)!;
  const date = logDate(input.date);
  await assertNoOverlap(ctx.ownerMembershipId, date, startMin, stopMin, rowId);
  await db.timeLog.update({
    where: { id: rowId },
    data: {
      date,
      startMin,
      stopMin,
      interruptMin: input.interruptMin,
      deltaMin: deltaMinutes({ startMin, stopMin, interruptMin: input.interruptMin }),
      phase: input.phase,
      componentId: input.componentId,
      taskId: input.taskId,
      comments: input.comments,
      ...updated(ctx.user.userId),
    },
  });
  return ok({ ok: true });
});

/** Soft delete: the row is kept for the audit trail. */
export const DELETE = route(async (_req, { params }: RouteContext<"/api/teams/[id]/logt/[rowId]">) => {
  const { id, rowId } = await params;
  const ctx = await ownRow(id, rowId);
  await db.timeLog.update({ where: { id: rowId }, data: { deletedAt: new Date(), deletedById: ctx.user.userId } });
  return ok({ ok: true });
});
