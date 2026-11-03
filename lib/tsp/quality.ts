/**
 * SUMP (Plan Summary) and SUMQ (Quality Summary) of Workbook v3.0, for the system or one assembly. Ratios with a zero
 * denominator are null (shown as "—").
 *
 * Plan hours per phase come from TASK. Planned defects are computed, and any phase can be typed over (lecturer's choice;
 * v3.0 types them):
 *   planned injected(p) = typed, else injection rate(p) × plan hours(p)
 *   planned removed(p)  = typed, else yield(p) × defects present in p (escaped from earlier phases + injected in p)
 * After System Test, UAT removes its yield of what escaped; the rest reaches Product Life.
 */
import type { Phase } from "@/generated/prisma/enums";
import { PHASES } from "./phases";
import type { ProgramSize } from "./sizes";

export type PhaseNumbers = Partial<Record<Phase, number>>;

/** Phases that count as development (v3.0 PHASES "Counts as development"): PLAN … ST. */
export const DEV_PHASES: readonly Phase[] = PHASES.filter((p) => p.development).map((p) => p.code);
/** Time-in-phase rows (every phase where time is logged). */
export const TIME_PHASES: readonly Phase[] = PHASES.filter((p) => p.logTime).map((p) => p.code);

/**
 * Planning defaults until the team has its own data: review and inspection yields from QUALGUIDE (70%), test yields as in
 * the TSP guidelines, and injection rates per hour for the phases that produce work.
 */
export const DEFAULT_PLAN_YIELDS: PhaseNumbers = {
  REQINSP: 0.7,
  HLDINSP: 0.7,
  DLDR: 0.7,
  DLDINSP: 0.7,
  CR: 0.7,
  BUILD: 0.5,
  CODEINSP: 0.7,
  UT: 0.9,
  WT: 0.8,
  IT: 0.8,
  ST: 0.8,
  UAT: 0.65,
};
export const DEFAULT_INJECTION_RATES: PhaseNumbers = {
  REQ: 0.25,
  HLD: 0.25,
  DLD: 0.75,
  CODE: 2.0,
  AIGEN: 2.0,
  BUILD: 0.3,
  UT: 0.067,
};

/** QPROFPARAM: the five targets behind the quality profile (v3.0 defaults). */
export const QUALITY_PROFILE_TARGETS = {
  designCode: 1,
  designReview: 0.5,
  codeReview: 0.5,
  buildDefectsPerKloc: 10,
  unitTestDefectsPerKloc: 5,
} as const;

const v = (m: PhaseNumbers, p: Phase) => m[p] ?? 0;
const sum = (m: PhaseNumbers, phases: readonly Phase[]) => phases.reduce((s, p) => s + v(m, p), 0);
export const div = (a: number, b: number): number | null => (b === 0 ? null : a / b);
const before = (p: Phase) => DEV_PHASES.slice(0, Math.max(0, DEV_PHASES.indexOf(p)));
const upTo = (p: Phase) => DEV_PHASES.slice(0, DEV_PHASES.indexOf(p) + 1);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Planned defects injected and removed per phase: typed values win, the rest from rates, hours and yields. */
export function plannedDefects(
  planHours: PhaseNumbers,
  rates: PhaseNumbers,
  yields: PhaseNumbers,
  typed: { injected?: PhaseNumbers; removed?: PhaseNumbers } = {},
): { injected: PhaseNumbers; removed: PhaseNumbers } {
  const injected: PhaseNumbers = {};
  const removed: PhaseNumbers = {};
  let escaping = 0;
  for (const p of DEV_PHASES) {
    injected[p] = typed.injected?.[p] ?? v(rates, p) * v(planHours, p);
    const present = escaping + injected[p]!;
    removed[p] = Math.min(present, typed.removed?.[p] ?? clamp01(v(yields, p)) * present);
    escaping = present - removed[p]!;
  }
  removed.UAT = Math.min(escaping, typed.removed?.UAT ?? clamp01(v(yields, "UAT")) * escaping);
  removed.PL = escaping - removed.UAT;
  return { injected, removed };
}

export interface QualityInput {
  size: { plan: ProgramSize; actual: ProgramSize };
  planHours: PhaseNumbers;
  actualHours: PhaseNumbers;
  /** Counts per phase, including UAT and PL. */
  actualInjected: PhaseNumbers;
  actualRemoved: PhaseNumbers;
  planInjectionRate: PhaseNumbers;
  planYield: PhaseNumbers;
  /** Planned defects typed over the computed ones. */
  typed?: { injected?: PhaseNumbers; removed?: PhaseNumbers };
  /** LOGAI lines kept and LOGD defects marked "from AI code". */
  ai?: { linesKept: number | null; defectsFromAi: number };
  /** LOGTEST summary, the coverage reported by CI (0–1, typed on SUMQ) and LOGD defects with no fix reference. */
  tests?: {
    total: number;
    pass: number;
    automated: number;
    byType: Partial<Record<string, number>>;
  };
  coverage?: number | null;
  openDefects?: { total: number; critical: number };
  /** Leaf parts measured in LOC, with the phases where defects were removed from them (Percent Defect Free). */
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
  /** Plan as a fraction of the section's plan total. */
  planPct: number | null;
}

const rows = (phases: readonly Phase[], plan: PhaseNumbers, actual: PhaseNumbers): PhaseRow[] => {
  const total = sum(actual, phases);
  const planTotal = sum(plan, phases);
  return phases.map((p) => ({
    phase: p,
    plan: v(plan, p),
    actual: v(actual, p),
    actualPct: div(v(actual, p), total),
    planPct: div(v(plan, p), planTotal),
  }));
};
const pa = (f: (side: "plan" | "actual") => number | null): PlanActual => ({
  plan: f("plan"),
  actual: f("actual"),
});

/** SUMP (v3.0): program size, time in phase, defects injected and removed, summary measures. */
export function computeSump(input: QualityInput) {
  const planned = plannedDefects(input.planHours, input.planInjectionRate, input.planYield, input.typed);
  const hours = {
    plan: sum(input.planHours, TIME_PHASES),
    actual: sum(input.actualHours, TIME_PHASES),
  };
  const rem = { plan: planned.removed, actual: input.actualRemoved };
  const devRemoved = (s: "plan" | "actual") => sum(rem[s], DEV_PHASES);
  const { plan, actual } = input.size;
  const N = (s: "plan" | "actual") => input.size[s].loc.newAndChanged;
  return {
    size: {
      srsPages: { plan: plan.reqPages, actual: actual.reqPages },
      sddPages: { plan: plan.hldPages, actual: actual.hldPages },
      newAndChanged: {
        plan: plan.loc.newAndChanged,
        actual: actual.loc.newAndChanged,
      },
      total: { plan: plan.loc.total, actual: actual.loc.total },
      reused: { plan: plan.loc.reused, actual: actual.loc.reused },
      screens: { plan: plan.screens, actual: actual.screens },
      widgets: { plan: plan.widgets, actual: actual.widgets },
    },
    time: rows(TIME_PHASES, input.planHours, input.actualHours),
    timeTotal: hours,
    injected: rows(DEV_PHASES, planned.injected, input.actualInjected),
    injectedTotal: {
      plan: sum(planned.injected, DEV_PHASES),
      actual: sum(input.actualInjected, DEV_PHASES),
    },
    injectedLater: {
      uat: v(input.actualInjected, "UAT"),
      pl: v(input.actualInjected, "PL"),
    },
    removed: rows(DEV_PHASES, planned.removed, input.actualRemoved),
    removedTotal: { plan: devRemoved("plan"), actual: devRemoved("actual") },
    removedLater: {
      uat: {
        plan: v(planned.removed, "UAT"),
        actual: v(input.actualRemoved, "UAT"),
      },
      pl: {
        plan: v(planned.removed, "PL"),
        actual: v(input.actualRemoved, "PL"),
      },
    },
    summary: {
      locPerHour: pa((s) => div(N(s), hours[s])),
      /** CPI = plan hours / actual hours (actual only). */
      cpi: { plan: null, actual: div(hours.plan, hours.actual) } as PlanActual,
      defectsPerKloc: pa((s) => {
        const d = div(devRemoved(s), N(s));
        return d === null ? null : d * 1000;
      }),
      hoursPerDefect: pa((s) => div(hours[s], devRemoved(s))),
      aiShare: {
        plan: null,
        actual: input.ai?.linesKept == null ? null : div(input.ai.linesKept, N("actual")),
      } as PlanActual,
      defectsFromAi: input.ai?.defectsFromAi ?? null,
      acceptanceDefects: v(input.actualRemoved, "UAT"),
    },
    planned,
  };
}
export type Sump = ReturnType<typeof computeSump>;

export type Verdict = "OK" | "LOW" | "HIGH" | "TOO FAST" | "ACTION";
export interface Guideline {
  /** Shown as written in v3.0 QUALGUIDE / SUMQ. */
  text: string;
  /** Numeric rule for the verdict, when there is one. */
  rule?: { op: ">=" | "<="; value: number; failed: Verdict };
}
export interface QualityRow extends PlanActual {
  label: string;
  guideline?: Guideline;
  verdict: Verdict | null;
  /** "pct" values are fractions shown as %. */
  format?: "pct" | "num" | "int";
}

const ge = (value: number, text = `≥ ${value}`): Guideline => ({
  text,
  rule: { op: ">=", value, failed: "LOW" },
});
const le = (value: number, failed: Verdict = "TOO FAST", text = `≤ ${value}`): Guideline => ({ text, rule: { op: "<=", value, failed } });

export function verdictFor(actual: number | null, g?: Guideline): Verdict | null {
  if (actual === null || !g?.rule) return null;
  const ok = g.rule.op === ">=" ? actual >= g.rule.value : actual <= g.rule.value;
  return ok ? "OK" : g.rule.failed;
}

const row = (label: string, values: PlanActual, guideline?: Guideline, format?: QualityRow["format"]): QualityRow => ({
  label,
  ...values,
  guideline,
  verdict: verdictFor(values.actual, guideline),
  format,
});

/** SUMQ (v3.0): density, ratios, time ratios, review rates and A/FR, phase and process yields, test & release, profile. */
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
  const phaseYield = (s: "plan" | "actual", p: Phase) => div(v(rem[s], p), sum(inj[s], upTo(p)) - sum(rem[s], before(p)));
  const processYield = (s: "plan" | "actual", p: Phase) => div(sum(rem[s], before(p)), sum(inj[s], before(p)));

  const density: QualityRow[] = [
    row(
      "Defects / page — requirements inspection",
      pa((s) => div(v(rem[s], "REQINSP"), size[s].reqPages)),
    ),
    row(
      "Defects / page — design inspection",
      pa((s) => div(v(rem[s], "HLDINSP"), size[s].hldPages)),
    ),
    ...(
      [
        ["DLDR", "Detailed design review"],
        ["DLDINSP", "Detailed design inspection"],
        ["CR", "Code review / PR review"],
        ["BUILD", "Build & static analysis"],
        ["CODEINSP", "Code inspection"],
        ["UT", "Unit test"],
        ["WT", "Widget test"],
        ["IT", "Integration test"],
        ["ST", "System test"],
      ] as const
    ).map(([p, label]) =>
      row(
        `Defects / KLOC — ${label}`,
        pa((s) => perKloc(s, v(rem[s], p))),
      ),
    ),
    row(
      "Defects / KLOC — total development",
      pa((s) => perKloc(s, devRemoved(s))),
    ),
    row("Defects / KLOC — client acceptance test", { plan: null, actual: perKloc("actual", v(rem.actual, "UAT")) }, le(0, "HIGH", "0")),
  ];
  const ratios: QualityRow[] = [
    row(
      "Design review defects / unit test defects",
      pa((s) => div(v(rem[s], "DLDR"), v(rem[s], "UT"))),
      ge(2, "≥ 2.0"),
    ),
    row(
      "Code review defects / build defects",
      pa((s) => div(v(rem[s], "CR"), v(rem[s], "BUILD"))),
      ge(2, "≥ 2.0"),
    ),
  ];
  const timeRatios: QualityRow[] = [
    row(
      "Requirements inspection / requirements",
      pa((s) => div(v(hrs[s], "REQINSP"), v(hrs[s], "REQ"))),
      ge(0.2, "≥ 0.20"),
    ),
    row(
      "Design inspection / high-level design",
      pa((s) => div(v(hrs[s], "HLDINSP"), v(hrs[s], "HLD"))),
      ge(0.2, "≥ 0.20"),
    ),
    row(
      "Detailed design / code",
      pa((s) => div(v(hrs[s], "DLD"), v(hrs[s], "CODE"))),
      ge(1, "≥ 1.00"),
    ),
    row(
      "Design review / detailed design",
      pa((s) => div(v(hrs[s], "DLDR"), v(hrs[s], "DLD"))),
      ge(0.5, "≥ 0.50"),
    ),
    row(
      "Code review / code",
      pa((s) => div(v(hrs[s], "CR"), v(hrs[s], "CODE"))),
      ge(0.5, "≥ 0.50"),
    ),
    row(
      "AI generation / total coding",
      pa((s) => div(v(hrs[s], "AIGEN"), v(hrs[s], "CODE"))),
      { text: "no target" },
    ),
  ];
  const reviewRates: QualityRow[] = [
    row(
      "Requirements inspection (pages/hr)",
      pa((s) => div(size[s].reqPages, v(hrs[s], "REQINSP"))),
      le(10),
    ),
    row(
      "Design inspection (pages/hr)",
      pa((s) => div(size[s].hldPages, v(hrs[s], "HLDINSP"))),
      le(10),
    ),
    row(
      "Detailed design review (LOC/hr)",
      pa((s) => div(N(s), v(hrs[s], "DLDR"))),
      le(200),
    ),
    row(
      "Detailed design inspection (LOC/hr)",
      pa((s) => div(N(s), v(hrs[s], "DLDINSP"))),
      le(200),
    ),
    row(
      "Code review (LOC/hr)",
      pa((s) => div(N(s), v(hrs[s], "CR"))),
      le(200),
    ),
    row(
      "Code inspection (LOC/hr)",
      pa((s) => div(N(s), v(hrs[s], "CODEINSP"))),
      le(200),
    ),
    /** A/FR = (DLDR + DLDINSP + CR + CODEINSP time) / (BUILD + UT + WT + IT + ST time). */
    row(
      "Appraisal / failure ratio (A/FR)",
      pa((s) => div(sum(hrs[s], ["DLDR", "DLDINSP", "CR", "CODEINSP"]), sum(hrs[s], ["BUILD", "UT", "WT", "IT", "ST"]))),
      ge(2, "≥ 2.0"),
    ),
  ];
  const phaseYields: QualityRow[] = DEV_PHASES.map((p) =>
    row(
      `${p} — ${PHASES.find((x) => x.code === p)!.name}`,
      pa((s) => phaseYield(s, p)),
      undefined,
      "pct",
    ),
  );
  const processYields: QualityRow[] = (
    [
      ["BUILD", "build & static analysis", 0.7],
      ["UT", "unit test", 0.7],
      ["WT", "widget test", 0.85],
      ["IT", "integration test", 0.85],
      ["ST", "system test", 0.85],
      ["UAT", "client acceptance test", 0.95],
    ] as const
  ).map(([p, label, goal]) =>
    row(
      `% removed before ${label}`,
      pa((s) => (p === "UAT" ? div(devRemoved(s), sum(inj[s], DEV_PHASES)) : processYield(s, p))),
      ge(goal, `≥ ${Math.round(goal * 100)}%`),
      "pct",
    ),
  );

  const t = input.tests;
  const share = (n: number | undefined) => (t ? div(n ?? 0, t.total) : null);
  const testRelease: QualityRow[] = [
    row("Test cases recorded", { plan: null, actual: t?.total ?? null }, { text: "≥ 50 by M3" }, "int"),
    row("Test pass rate", { plan: null, actual: t ? div(t.pass, t.total) : null }, { ...ge(0.95, "≥ 95%") }, "pct"),
    row("Automated share of test cases", { plan: null, actual: t ? div(t.automated, t.total) : null }, { ...ge(0.7, "≥ 70%") }, "pct"),
    row("Unit tests (share)", { plan: null, actual: share(t?.byType.UNIT) }, { text: "~60% of cases" }, "pct"),
    row("Widget tests (share)", { plan: null, actual: share(t?.byType.WIDGET) }, { text: "~30% of cases" }, "pct"),
    row("Integration tests (share)", { plan: null, actual: share(t?.byType.INTEGRATION) }, { text: "~10% of cases" }, "pct"),
    row("Code coverage reported by CI", { plan: null, actual: input.coverage ?? null }, ge(0.6, "≥ 60%"), "pct"),
    row("Open defects (no fix reference)", { plan: null, actual: input.openDefects?.total ?? null }, { text: "0 critical" }, "int"),
  ];
  if (input.openDefects && input.openDefects.critical > 0) testRelease.at(-1)!.verdict = "HIGH";

  const q = QUALITY_PROFILE_TARGETS;
  const axis = (label: string, value: number | null, target: number, higherIsBetter: boolean) => ({
    label,
    value,
    target,
    /** 0–1; 1 = target met (v3.0 CHARTDATA F). */
    score: value === null ? 0 : higherIsBetter ? Math.min(1, value / target) : value <= 0 ? 1 : Math.min(1, target / value),
  });
  const profile = [
    axis("Design / code time", div(v(hrs.actual, "DLD"), v(hrs.actual, "CODE")), q.designCode, true),
    axis("Design review time", div(v(hrs.actual, "DLDR"), v(hrs.actual, "DLD")), q.designReview, true),
    axis("Code review time", div(v(hrs.actual, "CR"), v(hrs.actual, "CODE")), q.codeReview, true),
    axis("Build defects / KLOC", perKloc("actual", v(rem.actual, "BUILD")), q.buildDefectsPerKloc, false),
    axis("Unit test defects / KLOC", perKloc("actual", v(rem.actual, "UT")), q.unitTestDefectsPerKloc, false),
  ];

  // Percent defect free (v3.0 CHARTDATA E): share of LOC parts with no defect found in each test phase.
  const parts = input.locParts.length;
  const percentDefectFree = (["BUILD", "UT", "IT", "ST", "UAT"] as Phase[]).map((p) => ({
    phase: p,
    actual: parts === 0 ? null : 1 - input.locParts.filter((x) => x.removedIn.includes(p)).length / parts,
  }));

  return {
    sections: [
      { key: "density", title: "Defect density", rows: density },
      { key: "ratios", title: "Defect ratios", rows: ratios },
      { key: "time", title: "Development time ratios", rows: timeRatios },
      { key: "rates", title: "Review & inspection rates", rows: reviewRates },
      {
        key: "phaseYield",
        title: "Phase yield — % of defects present that the phase caught",
        rows: phaseYields,
      },
      {
        key: "processYield",
        title: "Process yield — % of defects removed before entering the phase",
        rows: processYields,
      },
      { key: "test", title: "Test & release quality", rows: testRelease },
    ],
    profile,
    percentDefectFree,
    injectionRates: DEV_PHASES.map((p) => ({
      phase: p,
      plan: input.planInjectionRate[p] ?? null,
      actual: div(v(inj.actual, p), v(hrs.actual, p)),
    })),
  };
}
export type Sumq = ReturnType<typeof computeSumq>;
