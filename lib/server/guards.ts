import "server-only";
import { db } from "@/lib/db";
import { canAdminister, canManageRoster, canViewTeam, type TeamRef } from "@/lib/auth/permissions";
import { forbidden, notFound } from "@/lib/server/http";
import { requireApiUser, type CurrentUser } from "@/lib/server/viewer";

export async function requireLecturer(): Promise<CurrentUser> {
  const user = await requireApiUser();
  if (!canAdminister(user)) throw forbidden();
  return user;
}

export async function loadTeam(teamId: string): Promise<TeamRef & { semesterId: string }> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { id: true, labGroupId: true, labGroup: { select: { semesterId: true } } },
  });
  if (!team) throw notFound("Team");
  return { id: team.id, labGroupId: team.labGroupId, semesterId: team.labGroup.semesterId };
}

export async function requireTeamViewer(teamId: string) {
  const user = await requireApiUser();
  const team = await loadTeam(teamId);
  if (!canViewTeam(user, team)) throw notFound("Team"); // don't reveal other teams exist
  return { user, team };
}

export async function requireRosterManager(teamId: string) {
  const { user, team } = await requireTeamViewer(teamId);
  if (!canManageRoster(user, team)) throw forbidden();
  return { user, team };
}
