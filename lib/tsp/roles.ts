import type { TspiRole } from "@/generated/prisma/enums";

/** The five TSPi roles and the project roles they map to (docs/TSP_Student_Information_Sheet.md, J). */
export const TSPI_ROLES: readonly { role: TspiRole; label: string; projectRole: string }[] = [
  { role: "TEAM_LEADER", label: "Team Leader", projectRole: "Scrum Master & Client Contact" },
  { role: "DEVELOPMENT_MANAGER", label: "Development Manager", projectRole: "Tech Lead & AI Integration" },
  { role: "PLANNING_MANAGER", label: "Planning Manager", projectRole: "Product Owner & Schedule Lead" },
  { role: "QUALITY_PROCESS_MANAGER", label: "Quality/Process Manager", projectRole: "QA & Test Lead" },
  { role: "SUPPORT_MANAGER", label: "Support Manager", projectRole: "DevOps & Documentation Lead" },
];

export function roleLabel(role: TspiRole): string {
  return TSPI_ROLES.find((r) => r.role === role)?.label ?? role;
}

export const MIN_TEAM_SIZE = 5;
export const MAX_TEAM_SIZE = 6;

export interface RosterMember {
  membershipId: string;
  name: string;
  roles: readonly TspiRole[];
}

export interface RosterCheck {
  /** Block saving. */
  errors: string[];
  /** Shown to the team and staff, but allowed (teams are formed gradually). */
  warnings: string[];
}

/**
 * Checks a team's TSPi role assignment:
 * - each role is held by at most two members, and at most one role is shared;
 * - a role may only be shared in a 6-member team;
 * - warnings for unassigned roles, members without a role, and team size outside 5-6.
 */
export function checkRoster(members: readonly RosterMember[]): RosterCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const holders = new Map<TspiRole, string[]>();
  for (const m of members) {
    for (const r of new Set(m.roles)) holders.set(r, [...(holders.get(r) ?? []), m.name]);
  }
  const shared = TSPI_ROLES.filter((r) => (holders.get(r.role)?.length ?? 0) > 1);
  for (const r of TSPI_ROLES) {
    const names = holders.get(r.role) ?? [];
    if (names.length > 2) errors.push(`${r.label} is held by ${names.length} members; at most two may share a role.`);
    if (names.length === 0) warnings.push(`${r.label} is not assigned yet.`);
  }
  if (shared.length > 1) errors.push(`Only one role may be shared (shared now: ${shared.map((r) => r.label).join(", ")}).`);
  if (shared.length > 0 && members.length < MAX_TEAM_SIZE) {
    errors.push(`A role can only be shared in a ${MAX_TEAM_SIZE}-member team.`);
  }
  for (const m of members) {
    if (m.roles.length === 0) warnings.push(`${m.name} has no TSPi role.`);
    if (m.roles.length > 1) warnings.push(`${m.name} holds ${m.roles.length} roles.`);
  }
  if (members.length < MIN_TEAM_SIZE || members.length > MAX_TEAM_SIZE) {
    warnings.push(`Teams have ${MIN_TEAM_SIZE}-${MAX_TEAM_SIZE} members; this team has ${members.length}.`);
  }
  return { errors, warnings };
}

/** A team leader may not leave the team without any Team Leader (they would lock the team's forms). */
export function leavesTeamWithoutLeader(members: readonly RosterMember[]): boolean {
  return members.length > 0 && !members.some((m) => m.roles.includes("TEAM_LEADER"));
}
