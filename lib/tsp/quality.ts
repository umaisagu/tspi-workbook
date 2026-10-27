/**
 * SUMP (Plan Summary) and SUMQ (Quality Plan) for an assembly or SYSTEM, following the workbook
 * formulas in docs/workbook-formulas.md. Ratios with a zero denominator are null (shown as "—";
 * the workbook shows 0).
 *
 * Planned defects come from the SUMQ plan inputs:
 *   planned injected(p) = planned injection rate(p) × planned hours(p)
 *   planned removed(p)  = planned yield(p) × defects present in p (escaped from earlier phases + injected in p)
 */
import type { Phase } from "@/generated/prisma/enums";
import { PHASES } from "./phases";
import type { ProgramSize } from "./sizes";

export type PhaseNumbers = Partial<Record<Phase, number>>;

/** Development phases of the defect sections (SUMP rows 51–68 / 72–89: Planning through System Test). */
export const DEV_PHASES: readonly Phase[] = [
  "PLAN", "REQ", "STP", "REQINSP", "HLD", "ITP", "HLDINSP", "DLD", "DLDR", "TD", "DLDINSP", "CODE", "CR", "COMPILE", "CODEINSP", "UT", "IT", "ST",
];
/** Time-in-phase rows (SUMP rows 23–44). */
export const TIME_PHASES: readonly Phase[] = PHASES.filter((p) => p.logTime).map((p) => p.code);

/** Workbook SUMQ planning guidelines (columns K–L; QualGuide sheet). */
export const DEFAULT_PLAN_YIELDS: PhaseNumbers = {
  REQINSP: 0.7, HLDINSP: 0.7, DLDR: 0.7, DLDINSP: 0.7, CR: 0.7, COMPILE: 0.5, CODEINSP: 0.7, UT: 0.9, IT: 0.8, ST: 0.8, AT: 0.65,
};
export const DEFAULT_INJECTION_RATES: PhaseNumbers = { REQ: 0.25, HLD: 0.25, DLD: 0.75, CODE: 2.0, COMPILE: 0.3, UT: 0.067 };

const v = (m: PhaseNumbers, p: Phase) => m[p] ?? 0;
const sum = (m: PhaseNumbers, phases: readonly Phase[]) => phases.reduce((s, p) => s + v(m, p), 0);
export const div = (a: number, b: number): number | null => (b === 0 ? null : a / b);
const before = (p: Phase) => DEV_PHASES.slice(0, DEV_PHASES.indexOf(p));
const upTo = (p: Phase) => DEV_PHASES.slice(0, DEV_PHASES.indexOf(p) + 1);

/** Planned defects injected and removed per phase from planned hours, injection rates and yields. */
export function plannedDefects(planHours: PhaseNumbers, rates: PhaseNumbers, yields: PhaseNumbers): { injected: PhaseNumbers; removed: PhaseNumbers } {
  const injected: PhaseNumbers = {};
  const removed: PhaseNumbers = {};
  let escaping = 0;
  for (const p of DEV_PHASES) {
    injected[p] = v(rates, p) * v(planHours, p);
    const present = escaping + injected[p]!;
    removed[p] = Math.min(1, Math.max(0, v(yields, p))) * present;
    escaping = present - removed[p]!;
  }
  removed.AT = Math.min(1, Math.max(0, v(yields, "AT"))) * escaping;
  removed.PL = escaping - removed.AT;
  return { injected, removed };
}

export interface QualityInput {
  size: { plan: ProgramSize; actual: ProgramSize };
  planHours: PhaseNumbers;
  actualHours: PhaseNumbers;
  actualInjected: PhaseNumbers;
  /** Includes AT and PL. */
  actualRemoved: PhaseNumbers;
  planInjectionRate: PhaseNumbers;
  planYield: PhaseNumbers;
  /** Leaf parts measured in LOC, with the phases in which defects were removed from them (for Percent Defect Free). */
  locParts: readonly { removedIn: readonly Phase[] }[];
}

export interface PlanActual {
  plan: number | null;
  actual: number | null;
}
export interface PhaseRow {
  phase: Phase;
  plan: number;
  actual: number;
  /** Actual as a fraction of the section's actual total. */
  actualPct: number | null;
}

const rows = (phases: readonly Phase[], plan: PhaseNumbers, actual: PhaseNumbers): PhaseRow[] => {
  const total = sum(actual, phases);
  return phases.map((p) => ({ phase: p, plan: v(plan, p), actual: v(actual, p), actualPct: div(v(actual, p), total) }));
};

export function computeSump(input: QualityInput) {
  const planned = plannedDefects(input.planHours, input.planInjectionRate, input.planYield);
  const planTotalHours = sum(input.planHours, TIME_PHASES);
  const actualTotalHours = sum(input.actualHours, TIME_PHASES);
  const { plan, actual } = input.size;
  return {
    size: input.size,
    time: rows(TIME_PHASES, input.planHours, input.actualHours),
    timeTotal: { plan: planTotalHours, actual: actualTotalHours },
    injected: rows(DEV_PHASES, planned.injected, input.actualInjected),
    injectedTotal: { plan: sum(planned.injected, DEV_PHASES), actual: sum(input.actualInjected, DEV_PHASES) },
    removed: rows(DEV_PHASES, planned.removed, input.actualRemoved),
    removedTotal: { plan: sum(planned.removed, DEV_PHASES), actual: sum(input.actualRemoved, DEV_PHASES) },
    acceptanceTest: { plan: v(planned.removed, "AT"), actual: v(input.actualRemoved, "AT") },
    productLife: { plan: v(planned.removed, "PL"), actual: v(input.actualRemoved, "PL") },
    summary: {
      locPerHour: { plan: div(plan.loc.newAndChanged, planTotalHours), actual: div(actual.loc.newAndChanged, actualTotalHours) },
      /** CPI = plan hours / actual hours */
      cpi: { plan: null, actual: div(planTotalHours, actualTotalHours) } as PlanActual,
      reusePct: { plan: div(plan.loc.reused, plan.loc.total), actual: div(actual.loc.reused, actual.loc.total) },
      newReusePct: { plan: div(plan.loc.newReuse, plan.loc.newAndChanged), actual: div(actual.loc.newReuse, actual.loc.newAndChanged) },
    },
    planned,
  };
}
export type Sump = ReturnType<typeof computeSump>;

const pa = (f: (side: "plan" | "actual") => number | null): PlanActual => ({ plan: f("plan"), actual: f("actual") });

export function computeSumq(input: QualityInput, sump: Sump = computeSump(input)) {
  const inj = { plan: sump.planned.injected, actual: input.actualInjected };
  const rem = { plan: sump.planned.removed, actual: input.actualRemoved };
  const hrs = { plan: input.planHours, actual: input.actualHours };
  const size = input.size;
  const N = (s: "plan" | "actual") => size[s].loc.newAndChanged;
  const perKloc = (s: "plan" | "actual", n: number) => {
    const d = div(n, N(s));
    return d === null ? null : d * 1000;
  };
  const devRemoved = (s: "plan" | "actual") => sum(rem[s], DEV_PHASES);
  const devInjected = (s: "plan" | "actual") => sum(inj[s], DEV_PHASES);

  // SYSTEM percent defect free (actual): share of LOC parts with no defects removed in or after each test phase.
  const pdfPhases: Phase[] = ["COMPILE", "UT", "IT", "ST", "AT", "PL"];
  const parts = input.locParts.length;
  const percentDefectFree = pdfPhases.map((p) => ({
    phase: p,
    actual: parts === 0 ? null : 1 - input.locParts.filter((x) => x.removedIn.includes(p)).length / parts,
  }));

  const klocPhases: Phase[] = ["DLDR", "DLDINSP", "CR", "COMPILE", "CODEINSP", "UT", "IT", "ST"];
  const phaseYield = (s: "plan" | "actual", p: Phase) =>
    s === "plan" ? (input.planYield[p] ?? null) : div(v(rem.actual, p), sum(inj.actual, upTo(p)) - sum(rem.actual, before(p)));
  const processYield = (s: "plan" | "actual", p: Phase) => div(sum(rem[s], before(p)), sum(inj[s], before(p)));

  return {
    percentDefectFree,
    defectsPerPage: [
      { label: "REQ Inspection", ...pa((s) => div(v(rem[s], "REQINSP"), size[s].reqPages)) },
      { label: "HLD Inspection", ...pa((s) => div(v(rem[s], "HLDINSP"), size[s].hldPages)) },
    ],
    defectsPerKloc: [
      ...klocPhases.map((p) => ({ label: p as string, ...pa((s) => perKloc(s, v(rem[s], p))) })),
      { label: "Total Development", ...pa((s) => perKloc(s, devRemoved(s))) },
      { label: "AT", ...pa((s) => perKloc(s, v(rem[s], "AT"))) },
      { label: "PL", ...pa((s) => perKloc(s, v(rem[s], "PL"))) },
      { label: "Total", ...pa((s) => perKloc(s, devRemoved(s) + v(rem[s], "AT") + v(rem[s], "PL"))) },
    ],
    defectRatios: [
      { label: "DLD Review / Unit Test", ...pa((s) => div(v(rem[s], "DLDR"), v(rem[s], "UT"))) },
      { label: "Code Review / Compile", ...pa((s) => div(v(rem[s], "CR"), v(rem[s], "COMPILE"))) },
    ],
    timeRatios: [
      { label: "REQ Inspection / Requirements", ...pa((s) => div(v(hrs[s], "REQINSP"), v(hrs[s], "REQ"))) },
      { label: "HLD Inspection / High-Level Design", ...pa((s) => div(v(hrs[s], "HLDINSP"), v(hrs[s], "HLD"))) },
      { label: "Detailed Design / Code", ...pa((s) => div(v(hrs[s], "DLD"), v(hrs[s], "CODE"))) },
      { label: "DLD Review / Detailed Design", ...pa((s) => div(v(hrs[s], "DLDR"), v(hrs[s], "DLD"))) },
      { label: "Code Review / Code", ...pa((s) => div(v(hrs[s], "CR"), v(hrs[s], "CODE"))) },
    ],
    reviewRates: [
      { label: "REQ Inspection (pages/h)", ...pa((s) => div(size[s].reqPages, v(hrs[s], "REQINSP"))) },
      { label: "HLD Inspection (pages/h)", ...pa((s) => div(size[s].hldPages, v(hrs[s], "HLDINSP"))) },
      { label: "DLD Review (lines/h)", ...pa((s) => div(size[s].dldLines || N(s), v(hrs[s], "DLDR"))) },
      { label: "DLD Inspection (lines/h)", ...pa((s) => div(size[s].dldLines, v(hrs[s], "DLDINSP"))) },
      { label: "Code Review (LOC/h)", ...pa((s) => div(N(s), v(hrs[s], "CR"))) },
      { label: "Code Inspection (LOC/h)", ...pa((s) => div(N(s), v(hrs[s], "CODEINSP"))) },
    ],
    /** Appraisal/failure ratio: (DLDR + DLDINSP + CR + CODEINSP time) / (COMPILE + UT time). */
    afr: pa((s) => div(sum(hrs[s], ["DLDR", "DLDINSP", "CR", "CODEINSP"]), sum(hrs[s], ["COMPILE", "UT"]))),
    phaseYields: [
      ...DEV_PHASES.map((p) => ({ phase: p, ...pa((s) => phaseYield(s, p)) })),
      { phase: "AT" as Phase, ...pa((s) => (s === "plan" ? (input.planYield.AT ?? null) : div(v(rem.actual, "AT"), devInjected("actual") - devRemoved("actual")))) },
    ],
    processYields: [
      ...(["COMPILE", "UT", "IT", "ST"] as Phase[]).map((p) => ({ label: `% before ${p}`, ...pa((s) => processYield(s, p)) })),
      { label: "% before AT", ...pa((s) => div(devRemoved(s), devInjected(s))) },
    ],
    injectionRates: DEV_PHASES.map((p) => ({ phase: p, plan: input.planInjectionRate[p] ?? null, actual: div(v(inj.actual, p), v(hrs.actual, p)) })),
    removalRates: DEV_PHASES.map((p) => ({ phase: p, ...pa((s) => div(v(rem[s], p), v(hrs[s], p))) })),
  };
}
export type Sumq = ReturnType<typeof computeSumq>;
