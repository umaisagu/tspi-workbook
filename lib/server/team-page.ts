import "server-only";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canViewTeam } from "@/lib/auth/permissions";
import { currentTeamFor } from "@/lib/server/teams";
import { requirePageUser, type CurrentUser } from "@/lib/server/viewer";

/** A team page the viewer may see (team members, the group's demonstrator, the lecturer). */
export async function requireTeamPage(teamId: string): Promise<{ user: CurrentUser; team: { id: string; name: string; labGroupId: string; labGroupName: string; semesterName: string } }> {
  const user = await requirePageUser();
  const team = await db.team.findUnique({ where: { id: teamId }, include: { labGroup: { include: { semester: true } } } });
  if (!team || !canViewTeam(user, team)) notFound();
  return { user, team: { id: team.id, name: team.name, labGroupId: team.labGroupId, labGroupName: team.labGroup.name, semesterName: team.labGroup.semester.name } };
}

/** For student shortcuts (/team, /milestones): go to the student's own team page. */
export async function redirectToOwnTeam(suffix: string): Promise<never> {
  const user = await requirePageUser();
  const current = await currentTeamFor(user);
  if (!current) redirect("/dashboard");
  redirect(`/t/${current.team.id}${suffix}`);
}
