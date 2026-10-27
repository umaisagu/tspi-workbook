import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import type { Viewer } from "@/lib/auth/permissions";
import { unauthorized } from "@/lib/server/http";

export interface CurrentUser extends Viewer {
  name: string;
  email: string;
}

/**
 * Loads the signed-in user from the database on every request (not just the JWT):
 * deactivated users and sessions issued before a password reset are rejected here.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      memberships: { include: { roles: true, team: { select: { labGroupId: true } } } },
      demonstratorOf: { select: { labGroupId: true } },
    },
  });
  if (!user || !user.isActive || user.sessionVersion !== session.sv) return null;
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    appRole: user.appRole,
    memberships: user.memberships.map((m) => ({
      membershipId: m.id,
      teamId: m.teamId,
      labGroupId: m.team.labGroupId,
      roles: m.roles.map((r) => r.role),
      active: m.leftAt === null,
    })),
    demonstratorLabGroupIds: user.demonstratorOf.map((d) => d.labGroupId),
  };
});

/** For pages: redirect to /login when not signed in. */
export async function requirePageUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For API routes: 401 when not signed in. */
export async function requireApiUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}
