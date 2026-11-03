import { db } from "@/lib/db";
import { taskSchema } from "@/lib/schemas/forms";
import { created } from "@/lib/server/audit";
import { requireTaskPlan, requireTeamForm } from "@/lib/server/forms/access";
import { loadPlanning } from "@/lib/server/forms/planning";
import { assertComponent, assertTeammate, logDate } from "@/lib/server/forms/refs";
import { ok, parseJson, route } from "@/lib/server/http";

export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]/tasks">) => {
  const { id } = await params;
  await requireTeamForm(id, "read");
  const p = await loadPlanning(id);
  return ok({ tasks: p.tasks, totalPlanHours: p.schedule.totalTaskPlanHours, unscheduledTaskIds: p.schedule.unscheduledTaskIds });
});

/** Adds a task at the end of the plan (or at the given order). Team Leader or Planning Manager. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/tasks">) => {
  const { id } = await params;
  const { user } = await requireTaskPlan(id);
  const input = await parseJson(req, taskSchema);
  await assertComponent(id, input.componentId);
  await assertTeammate(id, input.assigneeMembershipId, "", "assigneeMembershipId");
  const last = await db.task.aggregate({ where: { teamId: id, deletedAt: null }, _max: { order: true } });
  const task = await db.task.create({
    data: {
      teamId: id,
      order: input.order ?? (last._max.order ?? 0) + 1,
      name: input.name,
      phase: input.phase,
      componentId: input.componentId,
      assigneeMembershipId: input.assigneeMembershipId,
      planHours: input.planHours,
      estSize: input.estSize,
      sizeMeasure: input.sizeMeasure,
      rate: input.rate,
      completedOn: input.completedOn ? logDate(input.completedOn, "completedOn") : null,
      ...created(user.userId),
    },
  });
  return ok({ id: task.id }, 201);
});
