import { requireTeamForm } from "@/lib/server/forms/access";
import { loadSums } from "@/lib/server/forms/quality";
import { ok, route } from "@/lib/server/http";

export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]/sums">) => {
  const { id } = await params;
  await requireTeamForm(id, "read");
  return ok(await loadSums(id));
});
