import { canCompleteTask, canEditTaskPlan } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { taskCompletionSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { logDate } from "@/lib/server/forms/refs";
import { HttpError, forbidden, notFound, ok, parseJson, route } from "@/lib/server/http";
import { MEMBER_TASK_STATUSES } from "@/lib/tsp/tasks";

/**
 * Set a task's status: Planned, In progress, or Complete on a date (EV is credited in that week). The assignee sets
 * these on their own task; the Team Leader and Planning Manager may also set Carried over or Cancelled.
 */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/tasks/[taskId]/complete">) => {
  const { id, taskId } = await params;
  const { user, team } = await requireTeamForm(id, "read");
  const task = await db.task.findFirst({ where: { id: taskId, teamId: id, deletedAt: null }, select: { assigneeMembershipId: true } });
  if (!task) throw notFound("Task");
  if (!canCompleteTask(user, team, task.assigneeMembershipId)) throw forbidden();
  const input = await parseJson(req, taskCompletionSchema);
  if (!MEMBER_TASK_STATUSES.includes(input.status) && !canEditTaskPlan(user, team)) {
    throw new HttpError(403, "Only the Team Leader or the Planning Manager can cancel or carry over a task.");
  }
  await db.task.update({
    where: { id: taskId },
    data: { status: input.status, completedOn: input.completedOn ? logDate(input.completedOn, "completedOn") : null, ...updated(user.userId) },
  });
  return ok({ ok: true });
});
