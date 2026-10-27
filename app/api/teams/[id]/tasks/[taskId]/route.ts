import { db } from "@/lib/db";
import { taskSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { assertComponent, assertTeammate, logDate } from "@/lib/server/forms/refs";
import { notFound, ok, parseJson, route } from "@/lib/server/http";

async function load(teamId: string, taskId: string) {
  const ctx = await requireTeamForm(teamId, "write");
  const task = await db.task.findFirst({ where: { id: taskId, teamId, deletedAt: null } });
  if (!task) throw notFound("Task");
  return ctx;
}

export const PATCH = route(async (req, { params }: RouteContext<"/api/teams/[id]/tasks/[taskId]">) => {
  const { id, taskId } = await params;
  const { user } = await load(id, taskId);
  const input = await parseJson(req, taskSchema);
  await assertComponent(id, input.componentId);
  await assertTeammate(id, input.assigneeMembershipId, "", "assigneeMembershipId");
  await db.task.update({
    where: { id: taskId },
    data: {
      ...(input.order !== null ? { order: input.order } : {}),
      name: input.name,
      phase: input.phase,
      componentId: input.componentId,
      assigneeMembershipId: input.assigneeMembershipId,
      planHours: input.planHours,
      estSize: input.estSize,
      sizeMeasure: input.sizeMeasure,
      rate: input.rate,
      completedOn: input.completedOn ? logDate(input.completedOn, "completedOn") : null,
      ...updated(user.userId),
    },
  });
  return ok({ ok: true });
});

/** Soft delete; LOGT entries keep their link for the audit trail but no longer count toward a task. */
export const DELETE = route(async (_req, { params }: RouteContext<"/api/teams/[id]/tasks/[taskId]">) => {
  const { id, taskId } = await params;
  const { user } = await load(id, taskId);
  await db.task.update({ where: { id: taskId }, data: { deletedAt: new Date(), deletedById: user.userId } });
  return ok({ ok: true });
});
