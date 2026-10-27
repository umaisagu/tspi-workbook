import { db } from "@/lib/db";
import { labGroupUpdateSchema } from "@/lib/schemas/admin";
import { updated } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { HttpError, notFound, ok, parseJson, route } from "@/lib/server/http";

export const PATCH = route(async (req, { params }: RouteContext<"/api/lab-groups/[id]">) => {
  const user = await requireLecturer();
  const { id } = await params;
  const input = await parseJson(req, labGroupUpdateSchema);
  if (!(await db.labGroup.findUnique({ where: { id }, select: { id: true } }))) throw notFound("Lab group");
  return ok(await db.labGroup.update({ where: { id }, data: { ...input, ...updated(user.userId) } }));
});

export const DELETE = route(async (_req, { params }: RouteContext<"/api/lab-groups/[id]">) => {
  await requireLecturer();
  const { id } = await params;
  const group = await db.labGroup.findUnique({ where: { id }, include: { _count: { select: { teams: true } } } });
  if (!group) throw notFound("Lab group");
  if (group._count.teams > 0) throw new HttpError(409, "Move or delete this group's teams first.");
  await db.labGroup.delete({ where: { id } });
  return ok({ ok: true });
});
