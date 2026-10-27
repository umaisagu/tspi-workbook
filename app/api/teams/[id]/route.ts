import { db } from "@/lib/db";
import { canManageRoster } from "@/lib/auth/permissions";
import { teamUpdateSchema } from "@/lib/schemas/admin";
import { updated } from "@/lib/server/audit";
import { requireLecturer, requireTeamViewer } from "@/lib/server/guards";
import { HttpError, forbidden, ok, parseJson, route } from "@/lib/server/http";

export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]">) => {
  const { id } = await params;
  await requireTeamViewer(id);
  return ok(
    await db.team.findUnique({
      where: { id },
      include: {
        labGroup: { select: { name: true } },
        memberships: {
          where: { leftAt: null },
          include: { user: { select: { name: true, email: true } }, roles: true },
          orderBy: { joinedAt: "asc" },
        },
      },
    }),
  );
});

/** Lecturer edits everything; the Team Leader may edit project title, client and repository URL. */
export const PATCH = route(async (req, { params }: RouteContext<"/api/teams/[id]">) => {
  const { id } = await params;
  const { user, team } = await requireTeamViewer(id);
  if (!canManageRoster(user, team)) throw forbidden();
  const input = await parseJson(req, teamUpdateSchema);
  if (user.appRole !== "LECTURER" && (input.name !== undefined || input.labGroupId !== undefined)) {
    throw new HttpError(403, "Only the lecturer can rename a team or move it to another lab group.");
  }
  const data = { ...input, ...(input.repoUrl !== undefined ? { repoUrl: input.repoUrl || null } : {}), ...updated(user.userId) };
  return ok(await db.team.update({ where: { id }, data }));
});

export const DELETE = route(async (_req, { params }: RouteContext<"/api/teams/[id]">) => {
  await requireLecturer();
  const { id } = await params;
  const count = await db.membership.count({ where: { teamId: id } });
  if (count > 0) throw new HttpError(409, "Only a team that never had members can be deleted.");
  await db.team.delete({ where: { id } });
  return ok({ ok: true });
});
