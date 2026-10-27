import { db } from "@/lib/db";
import { semesterUpdateSchema } from "@/lib/schemas/admin";
import { updated } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { notFound, ok, parseJson, route } from "@/lib/server/http";
import { parseDateOnly } from "@/lib/tsp/calendar";

export const PATCH = route(async (req, { params }: RouteContext<"/api/semesters/[id]">) => {
  const user = await requireLecturer();
  const { id } = await params;
  const input = await parseJson(req, semesterUpdateSchema);
  if (!(await db.semester.findUnique({ where: { id }, select: { id: true } }))) throw notFound("Semester");
  const { week1Monday, ...rest } = input;
  const semester = await db.$transaction(async (tx) => {
    // Only one semester is active at a time.
    if (input.isActive) await tx.semester.updateMany({ where: { id: { not: id } }, data: { isActive: false } });
    return tx.semester.update({
      where: { id },
      data: { ...rest, ...(week1Monday ? { week1Monday: parseDateOnly(week1Monday)! } : {}), ...updated(user.userId) },
    });
  });
  return ok(semester);
});
