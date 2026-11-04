/**
 * Member workbook MYSUMP (My Plan Summary) and MYSUMQ (My Quality Summary), Workbook v3.0, for one member.
 * Plan hours come from the member's own TASK rows, actuals from their own LOGT / LOGD / LOGTEST / LOGAI.
 * The size contribution is typed by the member (MYSUMP rows 88–90); test cases come from LOGTEST.
 */
import type { Phase } from "@/generated/prisma/enums";
import { DEV_PHASES, TIME_PHASES, div, verdictFor, type Guideline, type PhaseNumbers, type QualityRow } from "./quality";

export interface PersonalInput {
  planHours: PhaseNumbers;
  actualHours: PhaseNumbers;
  injected: PhaseNumbers;
  removed: PhaseNumbers;
  /** Defects in the member's LOGD (MYSUMQ counts every entry). */
  defects: number;
  size: { planLoc: number | null; actLoc: number | null; planPages: number | null; actPages: number | null; planScreens: number | null; actScreens: number | null };
  tests: { total: number; pass: number };
  ai: { linesGenerated: number; linesKept: number; noReviewer: number; selfReviewed: number };
}

const v = (m: PhaseNumbers, p: Phase) => m[p] ?? 0;
const sum = (m: PhaseNumbers, phases: readonly Phase[]) => phases.reduce((s, p) => s + v(m, p), 0);

/** Phases where a defect counts as "found before test" (MYSUMQ B15): reviews and inspections. */
export const REVIEW_PHASES: readonly Phase[] = ["DLDR", "DLDINSP", "CR", "CODEINSP"];

export function computeMySump(input: PersonalInput) {
  const phaseRows = (phases: readonly Phase[], plan: PhaseNumbers | null, actual: PhaseNumbers) => {
    const total = sum(actual, phases);
    return phases.map((p) => ({ phase: p, plan: plan ? v(plan, p) : null, actual: v(actual, p), actualPct: div(v(actual, p), total) }));
  };
  const s = input.size;
  return {
    time: phaseRows(TIME_PHASES, input.planHours, input.actualHours),
    timeTotal: { plan: sum(input.planHours, TIME_PHASES), actual: sum(input.actualHours, TIME_PHASES) },
    injected: phaseRows(DEV_PHASES, null, input.injected),
    injectedTotal: sum(input.injected, DEV_PHASES),
    removed: phaseRows(DEV_PHASES, null, input.removed),
    removedTotal: sum(input.removed, DEV_PHASES),
    size: [
      { key: "Loc", label: "New & changed Dart LOC I wrote", plan: s.planLoc, actual: s.actLoc, help: "Lines of Dart you added or changed, from your merged PRs" },
      { key: "Pages", label: "SRS / SDD pages I wrote", plan: s.planPages, actual: s.actPages, help: "Pages you personally drafted" },
      { key: "Screens", label: "Screens I built", plan: s.planScreens, actual: s.actScreens, help: "Screens you were the main author of" },
      { key: "Tests", label: "Test cases I wrote", plan: null, actual: input.tests.total, help: "From LOGTEST" },
    ],
  };
}
export type MySump = ReturnType<typeof computeMySump>;

/** Member workbook verdicts: below a minimum is LOW, above a maximum is ACTION. */
const g = (op: ">=" | "<=", value: number, text: string): Guideline => ({ text, rule: { op, value, failed: op === ">=" ? "LOW" : "ACTION" } });

export interface PersonalRow extends QualityRow {
  reading?: string;
}

const row = (label: string, actual: number | null, format: QualityRow["format"], guideline?: Guideline, reading?: string): PersonalRow => ({
  label,
  plan: null,
  actual,
  guideline,
  verdict: verdictFor(actual, guideline),
  format,
  reading,
});

/** MYSUMQ "My Measures", with the member workbook's guidelines. */
export function computeMySumq(input: PersonalInput): PersonalRow[] {
  const h = input.actualHours;
  const loc = input.size.actLoc;
  const perKloc = loc ? (input.defects / loc) * 1000 : null;
  const crHours = v(h, "CR");
  return [
    row("Hours logged", sum(h, TIME_PHASES), "num", undefined, "Everything you have recorded this semester."),
    row("Defects I found", input.defects, "int", undefined, "A higher number is better engineering, not worse work."),
    row("Defects / KLOC in my code", perKloc, "num", undefined, "Needs your LOC under My size contribution."),
    row("Design review / design time", div(v(h, "DLDR"), v(h, "DLD")), "num", g(">=", 0.5, "≥ 0.5"), "Time reviewing your own design against time producing it."),
    row("Code review / code time", div(crHours, v(h, "CODE") + v(h, "AIGEN")), "num", g(">=", 0.5, "≥ 0.5"), "Review time against time writing and generating code."),
    row("My code review rate (LOC/hr)", loc && crHours ? loc / crHours : null, "num", g("<=", 200, "≤ 200"), "Above 200 and you are reading too fast to find anything."),
    row(
      "A/FR (appraisal / failure)",
      div(v(h, "DLDR") + crHours, v(h, "BUILD") + v(h, "UT") + v(h, "WT")),
      "num",
      g(">=", 2, "≥ 2"),
      "Time reviewing against time fixing in test. Below 2 predicts a painful system test.",
    ),
    row(
      "% of my defects found before test",
      input.defects === 0 ? null : sum(input.removed, REVIEW_PHASES) / input.defects,
      "pct",
      g(">=", 0.7, "≥ 70%"),
      "Caught in review rather than by the machine.",
    ),
    row("My test pass rate", div(input.tests.pass, input.tests.total), "pct", g(">=", 0.95, "≥ 95%")),
    row("My AI keep rate", div(input.ai.linesKept, input.ai.linesGenerated), "pct", undefined, "Lines that survived review. Low is informative, not shameful."),
    row("My AI entries with no reviewer", input.ai.noReviewer, "int", g("<=", 0, "0"), "Any row here breaks the review rule."),
    row("My AI entries I reviewed myself", input.ai.selfReviewed, "int", g("<=", 0, "0"), "Self-review does not count as review."),
  ];
}
