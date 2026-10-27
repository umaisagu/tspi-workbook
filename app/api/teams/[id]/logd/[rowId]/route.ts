import { db } from "@/lib/db";
import { defectLogSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireIndividualForm } from "@/lib/server/forms/access";
import { assertComponent, assertFixRef, logDate } from "@/lib/server/forms/refs";
import { notFound, ok, parseJson, route } from "@/lib/server/http";

async function ownRow(teamId: string, rowId: string) {
  const ctx = await requireIndividualForm(teamId, null, "LOGD", "write");
  const row = await db.defectLog.findFirst({ where: { id: rowId, membershipId: ctx.ownerMembershipId, deletedAt: null } });
  if (!row) throw notFound("Defect");
  return ctx;
}

export const PATCH = route(async (req, { params }: RouteContext<"/api/teams/[id]/logd/[rowId]">) => {
  const { id, rowId } = await params;
  const ctx = await ownRow(id, rowId);
  const input = await parseJson(req, defectLogSchema);
  await assertComponent(id, input.componentId);
  await assertFixRef(ctx.ownerMembershipId, input.fixRefId, rowId);
  await db.defectLog.update({
    where: { id: rowId },
    data: {
      date: logDate(input.date),
      type: input.type,
      componentId: input.componentId,
      phaseInjected: input.phaseInjected,
      phaseRemoved: input.phaseRemoved,
      fixTimeMin: input.fixTimeMin,
      fixRefId: input.fixRefId,
      description: input.description,
      ...updated(ctx.user.userId),
    },
  });
  return ok({ ok: true });
});

export const DELETE = route(async (_req, { params }: RouteContext<"/api/teams/[id]/logd/[rowId]">) => {
  const { id, rowId } = await params;
  const ctx = await ownRow(id, rowId);
  await db.defectLog.update({ where: { id: rowId }, data: { deletedAt: new Date(), deletedById: ctx.user.userId } });
  return ok({ ok: true });
});
