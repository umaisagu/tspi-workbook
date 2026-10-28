import { db } from "@/lib/db";
import { semesterUpdateSchema } from "@/lib/schemas/admin";
import { updated } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { HttpError, notFound, ok, parseJson, route } from "@/lib/server/http";
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

/** Deletes a semester that has no lab groups yet (e.g. one created by mistake), with its milestones and settings. */
export const DELETE = route(async (_req, { params }: RouteContext<"/api/semesters/[id]">) => {
  await requireLecturer();
  const { id } = await params;
  const semester = await db.semester.findUnique({ where: { id }, include: { _count: { select: { labGroups: true } } } });
  if (!semester) throw notFound("Semester");
  if (semester._count.labGroups > 0) {
    throw new HttpError(409, "This semester has lab groups. Delete its lab groups (and their teams) first.");
  }
  await db.semester.delete({ where: { id } });
  return ok({ ok: true });
});
