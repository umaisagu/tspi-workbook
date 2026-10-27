import "server-only";
import type { TspiRole } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { isLecturer, type TeamRef } from "@/lib/auth/permissions";
import { HttpError, notFound } from "@/lib/server/http";
import { updated } from "@/lib/server/audit";
import type { CurrentUser } from "@/lib/server/viewer";
import { MAX_TEAM_SIZE, checkRoster, leavesTeamWithoutLeader, type RosterMember } from "@/lib/tsp/roles";

export async function loadRoster(teamId: string): Promise<RosterMember[]> {
  const members = await db.membership.findMany({
    where: { teamId, leftAt: null },
    include: { user: { select: { name: true } }, roles: true },
    orderBy: { joinedAt: "asc" },
  });
  return members.map((m) => ({ membershipId: m.id, name: m.user.name, roles: m.roles.map((r) => r.role) }));
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

export async function setRoles(actor: CurrentUser, team: TeamRef, membershipId: string, roles: readonly TspiRole[]) {
  const roster = await loadRoster(team.id);
  if (!roster.some((m) => m.membershipId === membershipId)) throw notFound("Member");
  const unique = [...new Set(roles)];
  const after = roster.map((m) => (m.membershipId === membershipId ? { ...m, roles: unique } : m));
  const check = checkRoster(after);
  if (check.errors.length > 0) throw new HttpError(409, check.errors.join(" "));
  if (!isLecturer(actor) && leavesTeamWithoutLeader(after)) {
    throw new HttpError(409, "The team must keep a Team Leader. Assign the role to someone else first.");
  }
  await db.$transaction([
    db.roleAssignment.deleteMany({ where: { membershipId } }),
    db.roleAssignment.createMany({ data: unique.map((role) => ({ membershipId, role, createdById: actor.userId })) }),
    db.membership.update({ where: { id: membershipId }, data: updated(actor.userId) }),
  ]);
  return check;
}
