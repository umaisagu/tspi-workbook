import type { TspiRole } from "@/generated/prisma/enums";

/**
 * The six TMA3084 roles and what each owns (Workbook v3.0, ROLES sheet). `QUALITY_PROCESS_MANAGER` keeps its
 * stored name; v3.0 calls the role Quality & Test Manager.
 */
export const TSPI_ROLES: readonly { role: TspiRole; label: string; owns: string }[] = [
  { role: "TEAM_LEADER", label: "Team Leader", owns: "Runs the launch and the weekly meeting, keeps the team to its plan, reports status." },
  { role: "PRODUCT_OWNER", label: "Product Owner", owns: "Owns the client relationship and the backlog; chairs client meetings and obtains sign-off." },
  { role: "DEVELOPMENT_MANAGER", label: "Development Manager", owns: "Owns the Flutter codebase and architecture, the branching model and the pull-request review rule." },
  { role: "PLANNING_MANAGER", label: "Planning Manager", owns: "Owns TASK and SCHEDULE; tracks earned value weekly and raises the alarm when the team drifts." },
  { role: "QUALITY_PROCESS_MANAGER", label: "Quality & Test Manager", owns: "Owns SUMQ, LOGD and LOGTEST: reviews, inspections, tests, defect density, yield and coverage." },
  { role: "SUPPORT_MANAGER", label: "Support Manager", owns: "Owns the repository, CI/CD, builds and configuration control; maintains the CCR log." },
];

export function roleLabel(role: TspiRole): string {
  return TSPI_ROLES.find((r) => r.role === role)?.label ?? role;
}

export const MIN_TEAM_SIZE = 5;
export const MAX_TEAM_SIZE = 6;
/** Nobody holds more than two roles (v3.0 role rotation rule). */
export const MAX_ROLES_PER_MEMBER = 2;

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
 * Checks a team's role assignment against the v3.0 rotation rule: all six roles are held, each by one
 * member; nobody holds more than two, so in a 5-member team exactly one member holds two.
 * - errors: a role held by more than one member, a member with more than two roles;
 * - warnings: unassigned roles, members without a role, a different number of double roles than
 *   6 − team size, and team size outside 5–6.
 */
export function checkRoster(members: readonly RosterMember[]): RosterCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  const holders = new Map<TspiRole, string[]>();
  for (const m of members) {
    for (const r of new Set(m.roles)) holders.set(r, [...(holders.get(r) ?? []), m.name]);
  }
  for (const r of TSPI_ROLES) {
    const names = holders.get(r.role) ?? [];
    if (names.length > 1) errors.push(`${r.label} is held by ${names.join(" and ")}; each role has one holder.`);
    if (names.length === 0) warnings.push(`${r.label} is not assigned yet.`);
  }
  for (const m of members) {
    const n = new Set(m.roles).size;
    if (n > MAX_ROLES_PER_MEMBER) errors.push(`${m.name} holds ${n} roles; nobody holds more than ${MAX_ROLES_PER_MEMBER}.`);
    if (n === 0) warnings.push(`${m.name} has no TSPi role.`);
  }
  if (members.length < MIN_TEAM_SIZE || members.length > MAX_TEAM_SIZE) {
    warnings.push(`Teams have ${MIN_TEAM_SIZE}-${MAX_TEAM_SIZE} members; this team has ${members.length}.`);
  } else {
    const doubles = members.filter((m) => new Set(m.roles).size === 2).length;
    const expected = TSPI_ROLES.length - members.length;
    if (doubles !== expected && errors.length === 0) {
      warnings.push(
        expected === 0
          ? `In a ${members.length}-member team each member holds one role (${doubles} hold two).`
          : `In a ${members.length}-member team exactly ${expected} member${expected === 1 ? "" : "s"} hold${expected === 1 ? "s" : ""} two roles (now ${doubles}).`,
      );
    }
  }
  return { errors, warnings };
}

/** A team leader may not leave the team without any Team Leader (they would lock the team's forms). */
export function leavesTeamWithoutLeader(members: readonly RosterMember[]): boolean {
  return members.length > 0 && !members.some((m) => m.roles.includes("TEAM_LEADER"));
}
