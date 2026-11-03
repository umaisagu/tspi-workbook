import { db } from "@/lib/db";
import { semesterCreateSchema } from "@/lib/schemas/admin";
import { created } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { HttpError, ok, parseJson, route } from "@/lib/server/http";
import { MILESTONE_DEFAULTS, milestoneDueAt } from "@/lib/tsp/milestones";
import { parseDateOnly } from "@/lib/tsp/calendar";

export const GET = route(async () => {
  await requireLecturer();
  return ok(await db.semester.findMany({ orderBy: { week1Monday: "desc" } }));
});

/** Creates a semester with M1-M4 milestones from the course defaults. */
export const POST = route(async (req) => {
  const user = await requireLecturer();
  const input = await parseJson(req, semesterCreateSchema);
  const week1Monday = parseDateOnly(input.week1Monday)!;
  const existing = await db.semester.findFirst({ where: { name: { equals: input.name.trim(), mode: "insensitive" } }, select: { id: true } });
  if (existing) throw new HttpError(409, `A semester named "${input.name.trim()}" already exists.`, { name: ["This name is already used"] });
  const semester = await db.semester.create({
    data: {
      name: input.name.trim(),
      week1Monday,
      weekCount: input.weekCount,
      breakWeeks: input.breakWeeks,
      ...created(user.userId),
      milestones: {
        create: MILESTONE_DEFAULTS.map((m) => ({
          code: m.code,
          title: m.title,
          week: m.week,
          dueAt: milestoneDueAt(m, week1Monday),
          requiredForms: m.requiredForms,
          peerRequired: m.requiredForms.includes("PEER"),
          ...created(user.userId),
        })),
      },
    },
  });
  return ok(semester, 201);
});
