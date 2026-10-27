import { db } from "@/lib/db";
import { timeLogSchema } from "@/lib/schemas/forms";
import { created } from "@/lib/server/audit";
import { requireIndividualForm } from "@/lib/server/forms/access";
import { listTimeLogs } from "@/lib/server/forms/logs";
import { assertComponent, assertNoOverlap, assertTask, logDate } from "@/lib/server/forms/refs";
import { ok, parseJson, route } from "@/lib/server/http";
import { deltaMinutes, parseClock } from "@/lib/tsp/time";

const member = (req: Request) => new URL(req.url).searchParams.get("member");

export const GET = route(async (req, { params }: RouteContext<"/api/teams/[id]/logt">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, member(req), "LOGT", "read");
  return ok(await listTimeLogs(ctx.ownerMembershipId, ctx.team.week1Monday));
});

/** Adds a LOGT entry to the signed-in member's own log. Delta time is always computed here. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/logt">) => {
  const { id } = await params;
  const ctx = await requireIndividualForm(id, null, "LOGT", "write");
  const input = await parseJson(req, timeLogSchema);
  await assertComponent(id, input.componentId);
  await assertTask(id, input.taskId);
  const startMin = parseClock(input.start)!;
  const stopMin = parseClock(input.stop)!;
  const date = logDate(input.date);
  await assertNoOverlap(ctx.ownerMembershipId, date, startMin, stopMin);
  const row = await db.timeLog.create({
    data: {
      membershipId: ctx.ownerMembershipId,
      date,
      startMin,
      stopMin,
      interruptMin: input.interruptMin,
      deltaMin: deltaMinutes({ startMin, stopMin, interruptMin: input.interruptMin }),
      phase: input.phase,
      componentId: input.componentId,
      taskId: input.taskId,
      comments: input.comments,
      ...created(ctx.user.userId),
    },
  });
  return ok({ id: row.id }, 201);
});
