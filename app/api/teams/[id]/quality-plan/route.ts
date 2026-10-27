import { db } from "@/lib/db";
import { qualityPlanSchema } from "@/lib/schemas/forms";
import { created } from "@/lib/server/audit";
import { requireTeamForm } from "@/lib/server/forms/access";
import { ok, parseJson, route } from "@/lib/server/http";

/**
 * SUMQ plan inputs for the SYSTEM: planned defect injection rates and phase yields.
 * Replaces the team's rows; `reset: true` deletes them so the workbook defaults apply again.
 */
export const PUT = route(async (req, { params }: RouteContext<"/api/teams/[id]/quality-plan">) => {
  const { id } = await params;
  const { user } = await requireTeamForm(id, "write");
  const input = await parseJson(req, qualityPlanSchema);
  const rows = input.reset ? [] : input.rows.filter((r) => r.planInjectionRate !== null || r.planYield !== null);
  await db.$transaction([
    db.qualityPlan.deleteMany({ where: { teamId: id, componentId: null } }),
    db.qualityPlan.createMany({
      data: rows.map((r) => ({ teamId: id, componentId: null, phase: r.phase, planInjectionRate: r.planInjectionRate, planYield: r.planYield, ...created(user.userId) })),
    }),
  ]);
  return ok({ ok: true, rows: rows.length });
});
