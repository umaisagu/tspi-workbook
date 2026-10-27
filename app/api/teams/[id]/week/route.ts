import { requireTeamForm } from "@/lib/server/forms/access";
import { loadWeekReports } from "@/lib/server/forms/team-forms";
import { ok, route } from "@/lib/server/http";

/** The weekly reports owed so far (from Week 5), with due dates and status. */
export const GET = route(async (_req, { params }: RouteContext<"/api/teams/[id]/week">) => {
  const { id } = await params;
  await requireTeamForm(id, "read");
  const d = await loadWeekReports(id, null);
  return ok(d.list);
});
