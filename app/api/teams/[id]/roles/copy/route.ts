import { copyRolesSchema } from "@/lib/schemas/admin";
import { requireRosterManager } from "@/lib/server/guards";
import { ok, parseJson, route } from "@/lib/server/http";
import { copyRolesForward } from "@/lib/server/roster";

/** Copies one milestone's role matrix to all later milestones (Team Leader or lecturer). */
export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/roles/copy">) => {
  const { id } = await params;
  const { user, team } = await requireRosterManager(id);
  const { fromMilestoneId } = await parseJson(req, copyRolesSchema);
  return ok(await copyRolesForward(user, team, fromMilestoneId));
});
