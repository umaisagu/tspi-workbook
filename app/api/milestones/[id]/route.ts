import { db } from "@/lib/db";
import { milestoneUpdateSchema } from "@/lib/schemas/admin";
import { updated } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { notFound, ok, parseJson, route } from "@/lib/server/http";

export const PATCH = route(async (req, { params }: RouteContext<"/api/milestones/[id]">) => {
  const user = await requireLecturer();
  const { id } = await params;
  const input = await parseJson(req, milestoneUpdateSchema);
  if (!(await db.milestone.findUnique({ where: { id }, select: { id: true } }))) throw notFound("Milestone");
  const { dueAt, ...rest } = input;
  return ok(
    await db.milestone.update({
      where: { id },
      data: { ...rest, ...(dueAt ? { dueAt: new Date(dueAt) } : {}), ...updated(user.userId) },
    }),
  );
});
