import "server-only";
import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/server/viewer";

/** The student's current team (active membership in the active semester, else the latest active membership). */
export async function currentTeamFor(user: CurrentUser) {
  const active = user.memberships.filter((m) => m.active);
  if (active.length === 0) return null;
  const teams = await db.team.findMany({
    where: { id: { in: active.map((m) => m.teamId) } },
    include: { labGroup: { include: { semester: true } } },
  });
  teams.sort((a, b) => Number(b.labGroup.semester.isActive) - Number(a.labGroup.semester.isActive) ||
    b.labGroup.semester.week1Monday.getTime() - a.labGroup.semester.week1Monday.getTime());
  const team = teams[0];
  if (!team) return null;
  const membership = active.find((m) => m.teamId === team.id)!;
  return { team, membership };
}

export async function teamWithRoster(teamId: string) {
  return db.team.findUnique({
    where: { id: teamId },
    include: {
      labGroup: { include: { semester: true } },
      memberships: {
        where: { leftAt: null },
        include: { user: { select: { id: true, name: true, email: true } }, roles: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}
