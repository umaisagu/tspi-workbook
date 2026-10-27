import { db } from "@/lib/db";
import { addByEmailSchema } from "@/lib/schemas/admin";
import { updated } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { HttpError, notFound, ok, parseJson, route } from "@/lib/server/http";

/** Assigns a registered user as demonstrator of the group (promoting a student account with no team). */
export const POST = route(async (req, { params }: RouteContext<"/api/lab-groups/[id]/demonstrators">) => {
  const actor = await requireLecturer();
  const { id } = await params;
  const { email } = await parseJson(req, addByEmailSchema);
  if (!(await db.labGroup.findUnique({ where: { id }, select: { id: true } }))) throw notFound("Lab group");
  const user = await db.user.findUnique({
    where: { email },
    include: { memberships: { where: { leftAt: null }, select: { id: true } } },
  });
  if (!user) throw new HttpError(404, "Please correct the highlighted fields.", { email: ["No account with this e-mail. Ask them to register first."] });
  if (user.appRole === "LECTURER") throw new HttpError(400, "Please correct the highlighted fields.", { email: ["This user is a lecturer."] });
  if (user.appRole === "STUDENT") {
    if (user.memberships.length > 0) {
      throw new HttpError(409, "Please correct the highlighted fields.", { email: ["This student is in a team and cannot be a demonstrator."] });
    }
    await db.user.update({ where: { id: user.id }, data: { appRole: "DEMONSTRATOR", ...updated(actor.userId) } });
  }
  await db.labGroupDemonstrator.upsert({
    where: { labGroupId_userId: { labGroupId: id, userId: user.id } },
    create: { labGroupId: id, userId: user.id, createdById: actor.userId },
    update: {},
  });
  return ok({ ok: true }, 201);
});
