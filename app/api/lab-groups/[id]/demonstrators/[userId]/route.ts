import { db } from "@/lib/db";
import { requireLecturer } from "@/lib/server/guards";
import { ok, route } from "@/lib/server/http";

export const DELETE = route(async (_req, { params }: RouteContext<"/api/lab-groups/[id]/demonstrators/[userId]">) => {
  await requireLecturer();
  const { id, userId } = await params;
  await db.labGroupDemonstrator.deleteMany({ where: { labGroupId: id, userId } });
  return ok({ ok: true });
});
