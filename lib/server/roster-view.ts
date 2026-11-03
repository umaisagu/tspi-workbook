import "server-only";
import type { RosterRow } from "@/components/roster/roster-manager";
import { checkRoster, roleLoadReading } from "@/lib/tsp/roles";
import type { teamWithRoster } from "@/lib/server/teams";
import { loadOneTeamRoles, rolesOf } from "@/lib/server/roles";

type TeamWithRoster = NonNullable<Awaited<ReturnType<typeof teamWithRoster>>>;

/**
 * Roster with the Workbook v3.0 ROLES matrix: members' roles in the selected milestone (default: the matrix that
 * applies now), the checks for that milestone, and the role load across all milestones.
 */
export async function rosterView(team: TeamWithRoster, viewerUserId: string, selected?: string | null) {
  const roles = await loadOneTeamRoles(team.id);
  const milestoneId =
    selected && roles.milestones.some((m) => m.id === selected) ? selected : (roles.effectiveMilestoneId ?? roles.currentMilestoneId);
  const rows: RosterRow[] = team.memberships.map((m) => ({
    membershipId: m.id,
    name: m.user.name,
    email: m.user.email,
    roles: rolesOf(roles, m.id, milestoneId),
    isSelf: m.user.id === viewerUserId,
  }));
  const check = checkRoster(rows);
  const milestones = roles.milestones.map((m) => ({
    id: m.id,
    code: m.code,
    current: m.id === roles.currentMilestoneId,
    applies: m.id === roles.effectiveMilestoneId,
    filled: roles.assignments.some((a) => a.milestoneId === m.id),
  }));
  const load = team.memberships.map((m) => {
    const counts = roles.milestones.map((ms) => rolesOf(roles, m.id, ms.id).length);
    return { name: m.user.name, counts, reading: roleLoadReading(counts) };
  });
  return { rows, ...check, milestones, milestoneId, load };
}
