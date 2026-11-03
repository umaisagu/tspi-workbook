import "server-only";
import type { TspiRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { isLecturer, type TeamRef } from "@/lib/auth/permissions";
import { HttpError, notFound } from "@/lib/server/http";
import { updated } from "@/lib/server/audit";
import type { CurrentUser } from "@/lib/server/viewer";
import { MAX_TEAM_SIZE, checkRoster, leavesTeamWithoutLeader, type RosterMember } from "@/lib/tsp/roles";
import { loadOneTeamRoles, rolesOf } from "@/lib/server/roles";

/** Current members with their roles in one milestone (default: the matrix that applies now). */
export async function loadRoster(teamId: string, milestoneId?: string | null): Promise<RosterMember[]> {
  const [members, roles] = await Promise.all([
    db.membership.findMany({ where: { teamId, leftAt: null }, include: { user: { select: { name: true } } }, orderBy: { joinedAt: "asc" } }),
    loadOneTeamRoles(teamId),
  ]);
  const ms = milestoneId === undefined ? roles.effectiveMilestoneId : milestoneId;
  return members.map((m) => ({ membershipId: m.id, name: m.user.name, roles: rolesOf(roles, m.id, ms) }));
}

/** The milestone a role edit applies to: the one given (of the team's semester) or the milestone in progress. */
async function targetMilestone(teamId: string, milestoneId: string | null | undefined): Promise<string> {
  const roles = await loadOneTeamRoles(teamId);
  const id = milestoneId ?? roles.currentMilestoneId;
  if (!id || !roles.milestones.some((m) => m.id === id)) throw new HttpError(400, "Choose one of this semester's milestones.");
  return id;
}

export async function addMember(actor: CurrentUser, team: TeamRef & { semesterId: string }, email: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    throw new HttpError(404, "Please correct the highlighted fields.", { email: ["No active account with this e-mail. Ask them to register first."] });
  }
  if (user.appRole !== "STUDENT") {
    throw new HttpError(400, "Please correct the highlighted fields.", { email: ["Only student accounts can join a team."] });
  }
  const elsewhere = await db.membership.findFirst({
    where: { userId: user.id, leftAt: null, teamId: { not: team.id }, team: { labGroup: { semesterId: team.semesterId } } },
    include: { team: { select: { name: true } } },
  });
  if (elsewhere) {
    throw new HttpError(409, "Please correct the highlighted fields.", { email: [`Already a member of team ${elsewhere.team.name} this semester.`] });
  }
  const roster = await loadRoster(team.id);
  if (roster.length >= MAX_TEAM_SIZE) throw new HttpError(409, `A team has at most ${MAX_TEAM_SIZE} members.`);
  return db.membership.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    create: { teamId: team.id, userId: user.id, createdById: actor.userId, updatedById: actor.userId },
    update: { leftAt: null, joinedAt: new Date(), ...updated(actor.userId) },
  });
}

export async function removeMember(actor: CurrentUser, team: TeamRef, membershipId: string) {
  const roster = await loadRoster(team.id);
  if (!roster.some((m) => m.membershipId === membershipId)) throw notFound("Member");
  const after = roster.filter((m) => m.membershipId !== membershipId);
  if (!isLecturer(actor) && leavesTeamWithoutLeader(after)) {
    throw new HttpError(409, "Assign another Team Leader before removing this member.");
  }
  await db.$transaction([
    db.roleAssignment.deleteMany({ where: { membershipId } }),
    db.membership.update({ where: { id: membershipId }, data: { leftAt: new Date(), ...updated(actor.userId) } }),
  ]);
}

/** Sets one member's roles in one milestone (Workbook v3.0 ROLES matrix). */
export async function setRoles(actor: CurrentUser, team: TeamRef, membershipId: string, roles: readonly TspiRole[], milestoneId?: string | null) {
  const ms = await targetMilestone(team.id, milestoneId);
  const roster = await loadRoster(team.id, ms);
  if (!roster.some((m) => m.membershipId === membershipId)) throw notFound("Member");
  const unique = [...new Set(roles)];
  const after = roster.map((m) => (m.membershipId === membershipId ? { ...m, roles: unique } : m));
  const check = checkRoster(after);
  if (check.errors.length > 0) throw new HttpError(409, check.errors.join(" "));
  if (!isLecturer(actor) && leavesTeamWithoutLeader(after)) {
    throw new HttpError(409, "The team must keep a Team Leader. Assign the role to someone else first.");
  }
  await db.$transaction([
    db.roleAssignment.deleteMany({ where: { membershipId, milestoneId: ms } }),
    db.roleAssignment.createMany({ data: unique.map((role) => ({ membershipId, role, milestoneId: ms, createdById: actor.userId })) }),
    db.membership.update({ where: { id: membershipId }, data: updated(actor.userId) }),
  ]);
  return check;
}

/** Copies one milestone's role matrix to every later milestone of the semester (replacing what was there). */
export async function copyRolesForward(actor: CurrentUser, team: TeamRef, fromMilestoneId: string) {
  const roles = await loadOneTeamRoles(team.id);
  const from = roles.milestones.findIndex((m) => m.id === fromMilestoneId);
  if (from === -1) throw new HttpError(400, "Choose one of this semester's milestones.");
  const later = roles.milestones.slice(from + 1).map((m) => m.id);
  const source = roles.assignments.filter((a) => a.milestoneId === fromMilestoneId);
  if (source.length === 0) throw new HttpError(409, "Assign roles for this milestone before copying them.");
  const memberIds = (await loadRoster(team.id, fromMilestoneId)).map((m) => m.membershipId);
  await db.$transaction([
    db.roleAssignment.deleteMany({ where: { membershipId: { in: memberIds }, milestoneId: { in: later } } }),
    db.roleAssignment.createMany({
      data: later.flatMap((milestoneId) =>
        source.filter((a) => memberIds.includes(a.membershipId)).map((a) => ({ membershipId: a.membershipId, role: a.role, milestoneId, createdById: actor.userId })),
      ),
    }),
  ]);
  return { milestones: later.length };
}
