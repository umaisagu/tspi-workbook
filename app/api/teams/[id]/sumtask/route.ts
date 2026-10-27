import { requireTeamForm } from "@/lib/server/forms/access";
import { loadPlanning } from "@/lib/server/forms/planning";
import { ok, route } from "@/lib/server/http";

/** SUMTASK is computed from TASK and LOGT; read-only. */
export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]/sumtask">) => {
  const { id } = await params;
  await requireTeamForm(id, "read");
  const p = await loadPlanning(id);
  return ok({ currentWeek: p.currentWeek, ...p.sumtask });
});
