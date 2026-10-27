import { db } from "@/lib/db";
import { userUpdateSchema } from "@/lib/schemas/admin";
import { updated } from "@/lib/server/audit";
import { requireLecturer } from "@/lib/server/guards";
import { HttpError, notFound, ok, parseJson, route } from "@/lib/server/http";

export const PATCH = route(async (req, { params }: RouteContext<"/api/users/[id]">) => {
  const actor = await requireLecturer();
  const { id } = await params;
  const input = await parseJson(req, userUpdateSchema);
  const user = await db.user.findUnique({
    where: { id },
    include: { memberships: { where: { leftAt: null }, select: { id: true } } },
  });
  if (!user) throw notFound("User");
  if (id === actor.userId && ((input.appRole !== undefined && input.appRole !== "LECTURER") || input.isActive === false)) {
    throw new HttpError(409, "You cannot remove your own lecturer access.");
  }
  if (input.appRole && input.appRole !== "STUDENT" && user.memberships.length > 0) {
    throw new HttpError(409, "Remove this user from their team before giving them a staff role.");
  }
  const data = {
    ...input,
    // Changing role or deactivating signs the user out everywhere.
    ...(input.appRole !== undefined || input.isActive === false ? { sessionVersion: { increment: 1 } } : {}),
    ...updated(actor.userId),
  };
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data });
    if (input.appRole && input.appRole !== "DEMONSTRATOR") await tx.labGroupDemonstrator.deleteMany({ where: { userId: id } });
  });
  return ok({ ok: true });
});
