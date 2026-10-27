import { db } from "@/lib/db";
import { defectLogSchema } from "@/lib/schemas/forms";
import { created } from "@/lib/server/audit";
import { requireIndividualForm } from "@/lib/server/forms/access";
import { listDefectLogs } from "@/lib/server/forms/logs";
import { assertComponent, assertFixRef, logDate, withSequenceRetry } from "@/lib/server/forms/refs";
import { ok, parseJson, route } from "@/lib/server/http";
import { nextDefectNumber } from "@/lib/tsp/defects";

const member = (req: Request) => new URL(req.url).searchParams.get("member");

export const GET = route(async (req, { params }: RouteContext<"/api/teams/[id]/logd">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, member(req), "LOGD", "read");
  return ok(await listDefectLogs(ctx.ownerMembershipId, ctx.team.week1Monday));
});

/** Adds a defect to the member's own LOGD; the defect number is the next in their sequence. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/logd">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, null, "LOGD", "write");
  const input = await parseJson(req, defectLogSchema);
  await assertComponent(id, input.componentId);
  await assertFixRef(ctx.ownerMembershipId, input.fixRefId);
  const date = logDate(input.date);
  const row = await withSequenceRetry(async () => {
    const numbers = await db.defectLog.findMany({ where: { membershipId: ctx.ownerMembershipId }, select: { number: true } });
    return db.defectLog.create({
      data: {
        membershipId: ctx.ownerMembershipId,
        number: nextDefectNumber(numbers.map((n) => n.number)),
        date,
        type: input.type,
        componentId: input.componentId,
        phaseInjected: input.phaseInjected,
        phaseRemoved: input.phaseRemoved,
        fixTimeMin: input.fixTimeMin,
        fixRefId: input.fixRefId,
        description: input.description,
        ...created(ctx.user.userId),
      },
    });
  });
  return ok({ id: row.id, number: row.number }, 201);
});
