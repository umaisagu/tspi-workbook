import "server-only";
import type { Phase } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { DEFAULT_INJECTION_RATES, DEFAULT_PLAN_YIELDS, DEV_PHASES, computeSump, computeSumq, type PhaseNumbers, type QualityInput } from "@/lib/tsp/quality";
import { descendantsOf, leafIds, programSize, sizeTotals, type ComponentNode, type SizeCounts } from "@/lib/tsp/sizes";

const add = (m: PhaseNumbers, p: Phase, n: number) => {
  m[p] = (m[p] ?? 0) + n;
};

function counts(c: { [k: string]: unknown }, prefix: "plan" | "act"): SizeCounts {
  const n = (k: string) => Number(c[`${prefix}${k}`] ?? 0);
  return { base: n("Base"), deleted: n("Deleted"), modified: n("Modified"), added: n("Added"), reused: n("Reused"), newReuse: n("NewReuse") };
}

/** Team data for SUMS, SUMP and SUMQ. */
async function loadQualityData(teamId: string) {
  const [components, tasks, logs, defects, plan] = await Promise.all([
    db.component.findMany({
      where: { teamId, deletedAt: null },
      orderBy: { name: "asc" },
      include: { owner: { include: { user: { select: { name: true } } } } },
    }),
    db.task.findMany({ where: { teamId, deletedAt: null }, select: { phase: true, planHours: true, componentId: true } }),
    db.timeLog.findMany({ where: { deletedAt: null, membership: { teamId } }, select: { phase: true, deltaMin: true, componentId: true } }),
    db.defectLog.findMany({
      where: { deletedAt: null, membership: { teamId } },
      select: { phaseInjected: true, phaseRemoved: true, componentId: true },
    }),
    db.qualityPlan.findMany({ where: { teamId, componentId: null } }),
  ]);
  const nodes: ComponentNode[] = components.map((c) => ({
    id: c.id,
    parentId: c.parentId,
    sizeMeasure: c.sizeMeasure,
    plan: counts(c, "plan"),
    actual: counts(c, "act"),
  }));
  const usingDefaults = plan.length === 0;
  const planInjectionRate: PhaseNumbers = usingDefaults ? { ...DEFAULT_INJECTION_RATES } : {};
  const planYield: PhaseNumbers = usingDefaults ? { ...DEFAULT_PLAN_YIELDS } : {};
  for (const q of plan) {
    if (q.planInjectionRate !== null) planInjectionRate[q.phase] = Number(q.planInjectionRate);
    if (q.planYield !== null) planYield[q.phase] = Number(q.planYield);
  }
  return { components, nodes, tasks, logs, defects, planInjectionRate, planYield, usingDefaults };
}
type QualityData = Awaited<ReturnType<typeof loadQualityData>>;

/** QualityInput for SYSTEM (scope null) or one assembly and its parts. */
function qualityInput(d: QualityData, scope: string | null): QualityInput {
  const inScope = scope === null ? null : descendantsOf(scope, d.nodes);
  const keep = (componentId: string | null) => inScope === null || (componentId !== null && inScope.has(componentId));
  const planHours: PhaseNumbers = {};
  const actualHours: PhaseNumbers = {};
  const actualInjected: PhaseNumbers = {};
  const actualRemoved: PhaseNumbers = {};
  for (const t of d.tasks) if (keep(t.componentId)) add(planHours, t.phase, Number(t.planHours));
  for (const l of d.logs) if (keep(l.componentId)) add(actualHours, l.phase, l.deltaMin / 60);
  for (const x of d.defects) {
    if (!keep(x.componentId)) continue;
    add(actualInjected, x.phaseInjected, 1);
    add(actualRemoved, x.phaseRemoved, 1);
  }
  const leaves = leafIds(d.nodes);
  const locParts = d.nodes
    .filter((n) => n.sizeMeasure === "LOC" && leaves.has(n.id) && (inScope === null || inScope.has(n.id)))
    .map((n) => ({ removedIn: d.defects.filter((x) => x.componentId === n.id).map((x) => x.phaseRemoved) }));
  return {
    size: { plan: programSize(d.nodes, scope, "plan"), actual: programSize(d.nodes, scope, "actual") },
    planHours,
    actualHours,
    actualInjected,
    actualRemoved,
    planInjectionRate: d.planInjectionRate,
    planYield: d.planYield,
    locParts,
  };
}

export async function loadSums(teamId: string) {
  const d = await loadQualityData(teamId);
  const leaves = leafIds(d.nodes);
  const rows = d.components.map((c) => {
    const node = d.nodes.find((n) => n.id === c.id)!;
    const scope = descendantsOf(c.id, d.nodes);
    const inScope = (id: string | null) => id !== null && scope.has(id);
    return {
      id: c.id,
      name: c.name,
      kind: c.kind,
      parentId: c.parentId,
      parentName: d.components.find((p) => p.id === c.parentId)?.name ?? null,
      ownerName: c.owner?.user.name ?? null,
      isLeaf: leaves.has(c.id),
      sizeMeasure: c.sizeMeasure,
      plan: sizeTotals(node.plan),
      actual: sizeTotals(node.actual),
      planHours: d.tasks.filter((t) => inScope(t.componentId)).reduce((s, t) => s + Number(t.planHours), 0),
      actualHours: Math.round((d.logs.filter((l) => inScope(l.componentId)).reduce((s, l) => s + l.deltaMin, 0) / 60) * 100) / 100,
      defectsInjected: d.defects.filter((x) => inScope(x.componentId)).length,
      defectsRemovedByPhase: Object.fromEntries(
        DEV_PHASES.map((p) => [p, d.defects.filter((x) => inScope(x.componentId) && x.phaseRemoved === p).length]).filter(([, n]) => n !== 0),
      ) as Record<string, number>,
    };
  });
  const unassigned = {
    hours: Math.round((d.logs.filter((l) => l.componentId === null).reduce((s, l) => s + l.deltaMin, 0) / 60) * 100) / 100,
    defects: d.defects.filter((x) => x.componentId === null).length,
  };
  return { rows, unassigned };
}
export type SumsRow = Awaited<ReturnType<typeof loadSums>>["rows"][number];

export async function loadSumpSumq(teamId: string, scope: string | null) {
  const d = await loadQualityData(teamId);
  const validScope = scope && d.nodes.some((n) => n.id === scope) ? scope : null;
  const input = qualityInput(d, validScope);
  const sump = computeSump(input);
  return {
    scope: validScope,
    scopes: d.components.map((c) => ({ id: c.id, name: c.name })),
    usingDefaults: d.usingDefaults,
    planInjectionRate: d.planInjectionRate,
    planYield: d.planYield,
    sump,
    sumq: computeSumq(input, sump),
  };
}
export type SumpSumq = Awaited<ReturnType<typeof loadSumpSumq>>;
