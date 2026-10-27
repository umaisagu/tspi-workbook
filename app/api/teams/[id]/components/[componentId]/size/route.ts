import { db } from "@/lib/db";
import { componentSizeSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { HttpError, notFound, ok, parseJson, route } from "@/lib/server/http";
import { sizeErrors } from "@/lib/tsp/sizes";

/** SUMS: sets a component's size measure and its planned and actual sizes. Team Leader only. */
export const PUT = route(async (req, { params }: RouteContext<"/api/teams/[id]/components/[componentId]/size">) => {
  const { id, componentId } = await params;
  const { user } = await requireTeamForm(id, "write");
  const c = await db.component.findFirst({ where: { id: componentId, teamId: id, deletedAt: null } });
  if (!c) throw notFound("Component");
  const input = await parseJson(req, componentSizeSchema);
  const errors = {
    ...sizeErrors("plan", { base: input.planBase, deleted: input.planDeleted, modified: input.planModified, added: input.planAdded, reused: input.planReused, newReuse: input.planNewReuse }),
    ...sizeErrors("act", { base: input.actBase, deleted: input.actDeleted, modified: input.actModified, added: input.actAdded, reused: input.actReused, newReuse: input.actNewReuse }),
  };
  if (Object.keys(errors).length > 0) {
    throw new HttpError(400, "Please correct the highlighted fields.", Object.fromEntries(Object.entries(errors).map(([k, m]) => [k, [m]])));
  }
  await db.component.update({ where: { id: componentId }, data: { ...input, ...updated(user.userId) } });
  return ok({ ok: true });
});
