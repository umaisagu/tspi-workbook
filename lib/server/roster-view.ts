import "server-only";
import type { RosterRow } from "@/components/roster/roster-manager";
import { checkRoster } from "@/lib/tsp/roles";
import type { teamWithRoster } from "@/lib/server/teams";

type TeamWithRoster = NonNullable<Awaited<ReturnType<typeof teamWithRoster>>>;

export function rosterView(team: TeamWithRoster, viewerUserId: string) {
  const rows: RosterRow[] = team.memberships.map((m) => ({
    membershipId: m.id,
    name: m.user.name,
    email: m.user.email,
    roles: m.roles.map((r) => r.role),
    isSelf: m.user.id === viewerUserId,
  }));
  const check = checkRoster(rows);
  return { rows, ...check };
}
