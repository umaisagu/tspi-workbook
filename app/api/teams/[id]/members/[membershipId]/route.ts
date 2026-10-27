import { requireRosterManager } from "@/lib/server/guards";
import { ok, route } from "@/lib/server/http";
import { removeMember } from "@/lib/server/roster";

/** Removes a member from the team (their records stay with the team). */
export const DELETE = route(async (_req, { params }: RouteContext<"/api/teams/[id]/members/[membershipId]">) => {
  const { id, membershipId } = await params;
  const { user, team } = await requireRosterManager(id);
  await removeMember(user, team, membershipId);
  return ok({ ok: true });
});
