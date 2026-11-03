import { canCompleteTask } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { taskCompletionSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { logDate } from "@/lib/server/forms/refs";
import { forbidden, notFound, ok, parseJson, route } from "@/lib/server/http";

/** Mark a task done on a date (EV is credited in that week) or not done; the assignee or the Team Leader. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/tasks/[taskId]/complete">) => {
  const { id, taskId } = await params;
  const { user, team } = await requireTeamForm(id, "read");
  const task = await db.task.findFirst({ where: { id: taskId, teamId: id, deletedAt: null }, select: { assigneeMembershipId: true } });
  if (!task) throw notFound("Task");
  if (!canCompleteTask(user, team, task.assigneeMembershipId)) throw forbidden();
  const input = await parseJson(req, taskCompletionSchema);
  await db.task.update({
    where: { id: taskId },
    data: { completedOn: input.completedOn ? logDate(input.completedOn, "completedOn") : null, ...updated(user.userId) },
  });
  return ok({ ok: true });
});
