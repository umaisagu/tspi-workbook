import "server-only";
import { db } from "@/lib/db";
import { canExport } from "@/lib/auth/permissions";
import { HttpError, notFound } from "@/lib/server/http";
import { loadTeam } from "@/lib/server/guards";
import { requireApiUser } from "@/lib/server/viewer";

/** Staff who may export this team (lecturer: all; demonstrator: own lab groups). Others get 404. */
export async function requireTeamExport(teamId: string | null) {
  if (!teamId) throw new HttpError(400, "Choose a team.");
  const user = await requireApiUser();
  const team = await loadTeam(teamId);
  if (!canExport(user, team)) throw notFound("Team");
  const info = await db.team.findUniqueOrThrow({ where: { id: teamId }, include: { labGroup: { include: { semester: true } } } });
  return { user, team, info };
}
