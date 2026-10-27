import { addByEmailSchema } from "@/lib/schemas/admin";
import { requireRosterManager } from "@/lib/server/guards";
import { ok, parseJson, route } from "@/lib/server/http";
import { addMember } from "@/lib/server/roster";

export const POST = route(async (req, { params }: RouteContext<"/api/teams/[id]/members">) => {
  const { id } = await params;
  const { user, team } = await requireRosterManager(id);
  const { email } = await parseJson(req, addByEmailSchema);
  const membership = await addMember(user, team, email);
  return ok({ membershipId: membership.id }, 201);
});
