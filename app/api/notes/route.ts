import { db } from "@/lib/db";
import { noteSchema } from "@/lib/schemas/forms";
import { requireLecturer } from "@/lib/server/guards";
import { notFound, ok, parseJson, route } from "@/lib/server/http";

/** Private lecturer notes on a team or a member. Never visible to students or demonstrators. */
export const POST = route(async (req) => {
  const user = await requireLecturer();
  const input = await parseJson(req, noteSchema);
  if (input.teamId && !(await db.team.findUnique({ where: { id: input.teamId }, select: { id: true } }))) throw notFound("Team");
  if (input.membershipId && !(await db.membership.findUnique({ where: { id: input.membershipId }, select: { id: true } }))) throw notFound("Member");
  const n = await db.lecturerNote.create({ data: { teamId: input.teamId, membershipId: input.membershipId, body: input.body, authorId: user.userId } });
  return ok({ id: n.id }, 201);
});
