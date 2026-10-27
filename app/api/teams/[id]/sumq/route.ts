import { requireTeamForm } from "@/lib/server/forms/access";
import { loadSumpSumq } from "@/lib/server/forms/quality";
import { ok, route } from "@/lib/server/http";

/** SUMQ for SYSTEM, or for one assembly with ?component=<id>. Computed, except the plan inputs. */
export const GET = route(async (req, { params }: RouteContext<"/api/teams/[id]/sumq">) => {
  const { id } = await params;
  await requireTeamForm(id, "read");
  const d = await loadSumpSumq(id, new URL(req.url).searchParams.get("component"));
  return ok({ scope: d.scope, usingDefaults: d.usingDefaults, planInjectionRate: d.planInjectionRate, planYield: d.planYield, ...d.sumq });
});
