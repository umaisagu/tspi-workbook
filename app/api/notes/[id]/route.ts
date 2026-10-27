import { db } from "@/lib/db";
import { requireLecturer } from "@/lib/server/guards";
import { ok, route } from "@/lib/server/http";

export const DELETE = route(async (_req, { params }: RouteContext<"/api/notes/[id]">) => {
  await requireLecturer();
  const { id } = await params;
  await db.lecturerNote.deleteMany({ where: { id } });
  return ok({ ok: true });
});
