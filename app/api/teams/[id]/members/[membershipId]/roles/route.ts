import { setRolesSchema } from "@/lib/schemas/admin";
import { requireRosterManager } from "@/lib/server/guards";
import { ok, parseJson, route } from "@/lib/server/http";
import { setRoles } from "@/lib/server/roster";

export const PUT = route(async (req, { params }: RouteContext<"/api/teams/[id]/members/[membershipId]/roles">) => {
  const { id, membershipId } = await params;
  const { user, team } = await requireRosterManager(id);
  const { roles } = await parseJson(req, setRolesSchema);
  const check = await setRoles(user, team, membershipId, roles);
  return ok({ warnings: check.warnings });
});
