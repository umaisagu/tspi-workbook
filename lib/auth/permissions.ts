import type { AppRole, FormType, TspiRole } from "@/generated/prisma/enums";

/**
 * Pure permission rules. Every API route and page loads a Viewer (lib/server/viewer.ts)
 * and asks these functions; nothing else decides access.
 *
 * App roles: LECTURER (admin), DEMONSTRATOR (read-only, own lab groups), STUDENT.
 * Team Leader rights come from holding the TSPi TEAM_LEADER role in that team.
 */
export interface ViewerMembership {
  membershipId: string;
  teamId: string;
  labGroupId: string;
  roles: readonly TspiRole[];
  active: boolean;
}

export interface Viewer {
  userId: string;
  appRole: AppRole;
  memberships: readonly ViewerMembership[];
  demonstratorLabGroupIds: readonly string[];
}

export interface TeamRef {
  id: string;
  labGroupId: string;
}

export const INDIVIDUAL_FORMS: readonly FormType[] = ["SI", "LOGT", "LOGD", "LOGAI", "PEER"];
export const TEAM_FORMS: readonly FormType[] = ["TASK", "SCHEDULE", "LOGTEST", "WEEK", "SUMS", "SUMP", "SUMQ", "SUMTASK", "CCR"];
/** Computed, read-only views: nobody types into them. */
export const COMPUTED_FORMS: readonly FormType[] = ["SUMS", "SUMP", "SUMQ", "SUMTASK"];

export function isLecturer(v: Viewer): boolean {
  return v.appRole === "LECTURER";
}

export function isStaff(v: Viewer): boolean {
  return v.appRole === "LECTURER" || v.appRole === "DEMONSTRATOR";
}

export function activeMembershipIn(v: Viewer, teamId: string): ViewerMembership | undefined {
  return v.memberships.find((m) => m.teamId === teamId && m.active);
}

export function isTeamLeaderOf(v: Viewer, teamId: string): boolean {
  return activeMembershipIn(v, teamId)?.roles.includes("TEAM_LEADER") ?? false;
}

export function demonstratesGroup(v: Viewer, labGroupId: string): boolean {
  return v.appRole === "DEMONSTRATOR" && v.demonstratorLabGroupIds.includes(labGroupId);
}

// ----- Administration (lecturer only) -----

export function canAdminister(v: Viewer): boolean {
  return isLecturer(v);
}

// ----- Teams and roster -----

export function canViewTeam(v: Viewer, team: TeamRef): boolean {
  return isLecturer(v) || demonstratesGroup(v, team.labGroupId) || activeMembershipIn(v, team.id) !== undefined;
}

/** Add/remove members and assign TSPi roles. */
export function canManageRoster(v: Viewer, team: TeamRef): boolean {
  return isLecturer(v) || isTeamLeaderOf(v, team.id);
}

// ----- Forms -----

/** Team-level forms (TASK, SCHEDULE plan, LOGTEST, WEEK, CCR, SUMS sizes, SUMQ plan) are read by the whole team. */
export function canReadTeamForms(v: Viewer, team: TeamRef): boolean {
  return canViewTeam(v, team);
}

/** Team-level forms are edited by the Team Leader. Staff never edit student records. */
export function canEditTeamForms(v: Viewer, team: TeamRef): boolean {
  return isTeamLeaderOf(v, team.id);
}

/**
 * Individual forms (SI, LOGT, LOGD, LOGAI, PEER): the owner, the lecturer, and the demonstrator
 * of the team's lab group may read them; PEER is restricted further (see canReadPeer).
 */
export function canReadIndividualForm(v: Viewer, team: TeamRef, ownerMembershipId: string, form: FormType): boolean {
  if (form === "PEER") return false; // use canReadPeer
  if (isLecturer(v) || demonstratesGroup(v, team.labGroupId)) return true;
  const own = activeMembershipIn(v, team.id);
  return own?.membershipId === ownerMembershipId;
}

/** Members edit only their own individual forms. */
export function canEditIndividualForm(v: Viewer, team: TeamRef, ownerMembershipId: string): boolean {
  const own = activeMembershipIn(v, team.id);
  return own !== undefined && own.membershipId === ownerMembershipId;
}

/** A PEER evaluation is visible only to its author and the Lecturer. */
export function canReadPeer(v: Viewer, evaluatorMembershipId: string): boolean {
  if (isLecturer(v)) return true;
  return v.memberships.some((m) => m.membershipId === evaluatorMembershipId);
}

/** Demonstrators (own groups) and the lecturer comment on forms; students read comments on their team's forms. */
export function canComment(v: Viewer, team: TeamRef): boolean {
  return isLecturer(v) || demonstratesGroup(v, team.labGroupId);
}

/** Comments on a form are readable by whoever may read the form itself. */
export function canReadComments(v: Viewer, team: TeamRef, form: FormType, membershipId: string | null): boolean {
  if (INDIVIDUAL_FORMS.includes(form)) {
    if (!membershipId) return false;
    return form === "PEER" ? canReadPeer(v, membershipId) : canReadIndividualForm(v, team, membershipId, form);
  }
  return canReadTeamForms(v, team);
}

// ----- Monitoring -----

/** Monitoring views, including contribution flags. Students never see them. */
export function canViewMonitoring(v: Viewer, labGroupId: string): boolean {
  return isLecturer(v) || demonstratesGroup(v, labGroupId);
}

/** Reviewing/dismissing flags, lecturer notes, monitoring settings, exports of everything. */
export function canManageMonitoring(v: Viewer): boolean {
  return isLecturer(v);
}

export function canReadLecturerNotes(v: Viewer): boolean {
  return isLecturer(v);
}

export function canExport(v: Viewer, team: TeamRef): boolean {
  return isLecturer(v) || demonstratesGroup(v, team.labGroupId);
}
