import { db } from "@/lib/db";
import { componentSchema } from "@/lib/schemas/forms";
import { updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { assertTeammate } from "@/lib/server/forms/refs";
import { HttpError, notFound, ok, parseJson, route } from "@/lib/server/http";

async function load(teamId: string, componentId: string) {
  const ctx = await requireTeamForm(teamId, "write");
  const c = await db.component.findFirst({ where: { id: componentId, teamId, deletedAt: null } });
  if (!c) throw notFound("Component");
  return ctx;
}

export const PATCH = route(async (req, { params }: RouteContext<"/api/teams/[id]/components/[componentId]">) => {
  const { id, componentId } = await params;
  const { user } = await load(id, componentId);
  const input = await parseJson(req, componentSchema);
  await assertTeammate(id, input.ownerMembershipId, "", "ownerMembershipId");
  if (input.parentId === componentId) {
    throw new HttpError(400, "Please correct the highlighted fields.", { parentId: ["A component cannot be its own parent"] });
  }
  const clash = await db.component.findFirst({ where: { teamId: id, name: input.name, id: { not: componentId } } });
  if (clash) throw new HttpError(409, "Please correct the highlighted fields.", { name: ["A component with this name already exists"] });
  await db.component.update({ where: { id: componentId }, data: { ...input, ...updated(user.userId) } });
  return ok({ ok: true });
});

/** Soft delete: existing log entries keep their link. */
export const DELETE = route(async (_req, { params }: RouteContext<"/api/teams/[id]/components/[componentId]">) => {
  const { id, componentId } = await params;
  const { user } = await load(id, componentId);
  await db.component.update({ where: { id: componentId }, data: { deletedAt: new Date(), deletedById: user.userId } });
  return ok({ ok: true });
});
