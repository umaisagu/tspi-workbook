import "server-only";
import type { TspiRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { currentMilestoneIndex, roleMilestoneId } from "@/lib/tsp/roles";

export interface TeamRoles {
  teamId: string;
  /** The semester's milestones, by due date. */
  milestones: { id: string; code: string; dueAt: Date }[];
  /** Milestone in progress (first not yet due, else the last). */
  currentMilestoneId: string | null;
  /** Milestone whose matrix applies now (the current one, or the fallback when the team has not filled it). */
  effectiveMilestoneId: string | null;
  assignments: { membershipId: string; role: TspiRole; milestoneId: string }[];
}

/**
 * Role matrices of the given teams (Workbook v3.0 ROLES). The roles that decide permissions are those of
 * `effectiveMilestoneId`; see roleMilestoneId for the fallback.
 */
export async function loadTeamRoles(teamIds: readonly string[], now: Date = new Date()): Promise<Map<string, TeamRoles>> {
  const out = new Map<string, TeamRoles>();
  if (teamIds.length === 0) return out;
  const [teams, assignments] = await Promise.all([
    db.team.findMany({
      where: { id: { in: [...teamIds] } },
      select: { id: true, labGroup: { select: { semester: { select: { milestones: { select: { id: true, code: true, dueAt: true }, orderBy: { dueAt: "asc" } } } } } } },
    }),
    db.roleAssignment.findMany({
      where: { membership: { teamId: { in: [...teamIds] } } },
      select: { membershipId: true, role: true, milestoneId: true, membership: { select: { teamId: true } } },
    }),
  ]);
  for (const t of teams) {
    const milestones = t.labGroup.semester.milestones;
    const mine = assignments.filter((a) => a.membership.teamId === t.id).map(({ membershipId, role, milestoneId }) => ({ membershipId, role, milestoneId }));
    const cur = currentMilestoneIndex(milestones, now);
    out.set(t.id, {
      teamId: t.id,
      milestones,
      currentMilestoneId: cur === -1 ? null : milestones[cur]!.id,
      effectiveMilestoneId: roleMilestoneId(milestones, new Set(mine.map((a) => a.milestoneId)), now),
      assignments: mine,
    });
  }
  return out;
}

export async function loadOneTeamRoles(teamId: string, now: Date = new Date()): Promise<TeamRoles> {
  const r = (await loadTeamRoles([teamId], now)).get(teamId);
  if (!r) throw new Error(`Team ${teamId} not found`);
  return r;
}

/** A member's roles in one milestone (default: the matrix that applies now). */
export function rolesOf(t: TeamRoles | undefined, membershipId: string, milestoneId: string | null = t?.effectiveMilestoneId ?? null): TspiRole[] {
  if (!t || !milestoneId) return [];
  return t.assignments.filter((a) => a.membershipId === membershipId && a.milestoneId === milestoneId).map((a) => a.role);
}
