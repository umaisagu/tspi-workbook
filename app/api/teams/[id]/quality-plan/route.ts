import type { Phase } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { qualityPlanSchema } from "@/lib/schemas/forms";
import { created, updated } from "@/lib/server/audit";
import { requireQualityPlan, requireSizePlan } from "@/lib/server/forms/access";
import { ok, parseJson, route } from "@/lib/server/http";

type Values = {
  planInjectionRate?: number | null;
  planYield?: number | null;
  plannedInjected?: number | null;
  plannedRemoved?: number | null;
};

/**
 * The SYSTEM quality plan. `part: "rates"`: SUMQ injection rates, yields and CI coverage (Team Leader or Quality & Test
 * Manager); `part: "defects"`: SUMP planned defects typed over the computed ones (Team Leader or Planning Manager).
 * Each part replaces only its own columns; `reset` clears them (rates fall back to the workbook guidelines; coverage is kept).
 */
export const PUT = route(async (req, { params }: RouteContext<"/api/teams/[id]/quality-plan">) => {
  const { id } = await params;
  const input = await parseJson(req, qualityPlanSchema);
  const { user } = input.part === "rates" ? await requireQualityPlan(id) : await requireSizePlan(id);
  const values = new Map<Phase, Values>();
  for (const r of input.reset ? [] : input.rows) {
    values.set(
      r.phase,
      input.part === "rates" && "planYield" in r
        ? { planInjectionRate: r.planInjectionRate, planYield: r.planYield }
        : "plannedInjected" in r
          ? {
              plannedInjected: r.plannedInjected,
              plannedRemoved: r.plannedRemoved,
            }
          : {},
    );
  }
  const cleared: Values = input.part === "rates" ? { planInjectionRate: null, planYield: null } : { plannedInjected: null, plannedRemoved: null };
  await db.$transaction(async (tx) => {
    const existing = await tx.qualityPlan.findMany({
      where: { teamId: id, componentId: null },
    });
    for (const row of existing) {
      await tx.qualityPlan.update({
        where: { id: row.id },
        data: {
          ...cleared,
          ...values.get(row.phase),
          ...updated(user.userId),
        },
      });
      values.delete(row.phase);
    }
    const fresh = [...values].filter(([, v]) => Object.values(v).some((x) => x !== null && x !== undefined));
    if (fresh.length > 0) {
      await tx.qualityPlan.createMany({
        data: fresh.map(([phase, v]) => ({
          teamId: id,
          componentId: null,
          phase,
          ...v,
          ...created(user.userId),
        })),
      });
    }
    await tx.qualityPlan.deleteMany({
      where: {
        teamId: id,
        componentId: null,
        planInjectionRate: null,
        planYield: null,
        plannedInjected: null,
        plannedRemoved: null,
      },
    });
    if (input.part === "rates" && !input.reset) {
      await tx.team.update({
        where: { id },
        data: { coverage: input.coverage, ...updated(user.userId) },
      });
    }
  });
  return ok({ ok: true });
});
