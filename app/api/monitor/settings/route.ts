import { z } from "zod";
import { db } from "@/lib/db";
import { thresholdsSchema } from "@/lib/monitoring/settings";
import { created, updated } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { thresholdsFor } from "@/lib/server/monitoring";
import { HttpError, notFound, ok, parseJson, route } from "@/lib/server/http";

async function activeSemester() {
  const s = await db.semester.findFirst({ where: { isActive: true } });
  if (!s) throw new HttpError(404, "No active semester.");
  return s;
}

export const GET = route(async () => {
  await requireLecturer();
  const s = await activeSemester();
  return ok({ semesterId: s.id, thresholds: await thresholdsFor(s.id) });
});

/** Lecturer: set the flag and team-status thresholds for the active (or given) semester. */
export const PUT = route(async (req) => {
  const user = await requireLecturer();
  const input = await parseJson(req, z.object({ semesterId: z.string().optional(), thresholds: thresholdsSchema }));
  const semester = input.semesterId ? await db.semester.findUnique({ where: { id: input.semesterId } }) : await activeSemester();
  if (!semester) throw notFound("Semester");
  await db.monitoringSettings.upsert({
    where: { semesterId: semester.id },
    create: { semesterId: semester.id, thresholds: input.thresholds, ...created(user.userId) },
    update: { thresholds: input.thresholds, ...updated(user.userId) },
  });
  return ok({ ok: true });
});
