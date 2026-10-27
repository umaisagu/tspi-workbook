import { db } from "@/lib/db";
import { labGroupCreateSchema } from "@/lib/schemas/admin";
import { created } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { HttpError, ok, parseJson, route } from "@/lib/server/http";

export const POST = route(async (req) => {
  const user = await requireLecturer();
  const input = await parseJson(req, labGroupCreateSchema);
  const clash = await db.labGroup.findUnique({ where: { semesterId_name: { semesterId: input.semesterId, name: input.name } } });
  if (clash) throw new HttpError(409, "Please correct the highlighted fields.", { name: ["A lab group with this name already exists."] });
  return ok(await db.labGroup.create({ data: { ...input, ...created(user.userId) } }), 201);
});
