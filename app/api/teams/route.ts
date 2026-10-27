import { db } from "@/lib/db";
import { teamCreateSchema } from "@/lib/schemas/admin";
import { created } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { HttpError, notFound, ok, parseJson, route } from "@/lib/server/http";

export const POST = route(async (req) => {
  const user = await requireLecturer();
  const input = await parseJson(req, teamCreateSchema);
  if (!(await db.labGroup.findUnique({ where: { id: input.labGroupId }, select: { id: true } }))) throw notFound("Lab group");
  const clash = await db.team.findUnique({ where: { labGroupId_name: { labGroupId: input.labGroupId, name: input.name } } });
  if (clash) throw new HttpError(409, "Please correct the highlighted fields.", { name: ["This lab group already has a team with this name."] });
  const team = await db.team.create({
    data: { ...input, repoUrl: input.repoUrl || null, ...created(user.userId) },
  });
  return ok(team, 201);
});
