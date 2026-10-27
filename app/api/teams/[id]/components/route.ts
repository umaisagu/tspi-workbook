import { db } from "@/lib/db";
import { componentSchema } from "@/lib/schemas/forms";
import { created, updated } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { listComponents } from "@/lib/server/forms/logs";
import { HttpError, ok, parseJson, route } from "@/lib/server/http";
import { assertTeammate } from "@/lib/server/forms/refs";

export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]/components">) => {
  const { id } = await params;
  await requireTeamForm(id, "read");
  return ok(await listComponents(id));
});

/** Adds a component (workbook "assembly"/"part"); sizes are entered on SUMS. Re-adding a deleted name restores it. */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/components">) => {
  const { id } = await params;
  const { user } = await requireTeamForm(id, "write");
  const input = await parseJson(req, componentSchema);
  await assertTeammate(id, input.ownerMembershipId, "", "ownerMembershipId");
  if (input.parentId) {
    const parent = await db.component.findFirst({ where: { id: input.parentId, teamId: id, deletedAt: null } });
    if (!parent) throw new HttpError(400, "Please correct the highlighted fields.", { parentId: ["Choose one of your components"] });
  }
  const existing = await db.component.findUnique({ where: { teamId_name: { teamId: id, name: input.name } } });
  if (existing && !existing.deletedAt) {
    throw new HttpError(409, "Please correct the highlighted fields.", { name: ["A component with this name already exists"] });
  }
  const row = existing
    ? await db.component.update({ where: { id: existing.id }, data: { ...input, deletedAt: null, deletedById: null, ...updated(user.userId) } })
    : await db.component.create({ data: { ...input, teamId: id, ...created(user.userId) } });
  return ok({ id: row.id }, 201);
});
