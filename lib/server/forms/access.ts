import "server-only";
import type { FormType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import {
  activeMembershipIn,
  canEditIndividualForm,
  canEditTeamForms,
  canReadIndividualForm,
  canReadTeamForms,
  type TeamRef,
} from "@/lib/auth/permissions";
import { HttpError, forbidden, notFound } from "@/lib/server/http";
import { loadTeam } from "@/lib/server/guards";
import { requireApiUser, type CurrentUser } from "@/lib/server/viewer";

export interface TeamContext {
  user: CurrentUser;
  team: TeamRef & { semesterId: string; week1Monday: Date };
}

export interface OwnerContext extends TeamContext {
  ownerMembershipId: string;
  canEdit: boolean;
}

async function teamWithCalendar(teamId: string) {
  const team = await loadTeam(teamId);
  const semester = await db.semester.findUniqueOrThrow({ where: { id: team.semesterId }, select: { week1Monday: true } });
  return { ...team, week1Monday: semester.week1Monday };
}

/**
 * Access to one member's individual form (SI, LOGT, LOGD, LOGAI).
 * `member` defaults to the viewer's own membership in the team.
 */
export async function individualFormAccess(
  user: CurrentUser,
  teamId: string,
  member: string | null | undefined,
  form: FormType,
  mode: "read" | "write",
): Promise<OwnerContext> {
  const team = await teamWithCalendar(teamId);
  const ownerMembershipId = member || activeMembershipIn(user, teamId)?.membershipId;
  if (!ownerMembershipId) throw new HttpError(400, "Choose a team member.");
  const owner = await db.membership.findUnique({ where: { id: ownerMembershipId }, select: { teamId: true } });
  if (!owner || owner.teamId !== teamId) throw notFound("Member");
  if (!canReadIndividualForm(user, team, ownerMembershipId, form)) throw notFound("Form");
  const canEdit = canEditIndividualForm(user, team, ownerMembershipId);
  if (mode === "write" && !canEdit) throw forbidden();
  return { user, team, ownerMembershipId, canEdit };
}

export async function requireIndividualForm(teamId: string, member: string | null | undefined, form: FormType, mode: "read" | "write") {
  return individualFormAccess(await requireApiUser(), teamId, member, form, mode);
}

/** Access to team-level data (components now; TASK, SCHEDULE, … in later stages). */
export async function requireTeamForm(teamId: string, mode: "read" | "write"): Promise<TeamContext> {
  const user = await requireApiUser();
  const team = await teamWithCalendar(teamId);
  if (!canReadTeamForms(user, team)) throw notFound("Team");
  if (mode === "write" && !canEditTeamForms(user, team)) throw forbidden();
  return { user, team };
}
