import type { Phase } from "@/generated/prisma/enums";
import { PHASES } from "./phases";

/** Defect type standard (Workbook v3.0, DEFECTTYPES sheet): 10-100 TSP standard, 110-150 added for TMA3084. */
export const DEFECT_TYPES: readonly { code: number; name: string }[] = [
  { code: 10, name: "Documentation" },
  { code: 20, name: "Syntax" },
  { code: 30, name: "Build / Package" },
  { code: 40, name: "Assignment" },
  { code: 50, name: "Interface" },
  { code: 60, name: "Checking" },
  { code: 70, name: "Data" },
  { code: 80, name: "Function" },
  { code: 90, name: "System" },
  { code: 100, name: "Environment" },
  { code: 110, name: "UI / Layout" },
  { code: 120, name: "State Management" },
  { code: 130, name: "Performance" },
  { code: 140, name: "Security" },
  { code: 150, name: "AI-Generated" },
];

export function isDefectType(code: number): boolean {
  return DEFECT_TYPES.some((t) => t.code === code);
}

export function defectTypeLabel(code: number): string {
  const t = DEFECT_TYPES.find((d) => d.code === code);
  return t ? `${t.code} ${t.name}` : String(code);
}

/** Next defect number for a member's LOGD (workbook "Num": a calculated sequence). Numbers are never reused. */
export function nextDefectNumber(existing: readonly number[]): number {
  return existing.reduce((max, n) => Math.max(max, n), 0) + 1;
}

const order = new Map(PHASES.map((p, i) => [p.code, i]));

/** Phases where defects can be injected / removed (workbook Phases sheet flags). */
export const INJECTION_PHASES: readonly Phase[] = PHASES.filter((p) => p.defectsInjected).map((p) => p.code);
export const REMOVAL_PHASES: readonly Phase[] = PHASES.filter((p) => p.defectsRemoved).map((p) => p.code);

/** Field → message for an invalid defect's phases; a defect cannot be removed before the phase that injected it. */
export function defectPhaseErrors(injected: Phase, removed: Phase): Partial<Record<"phaseInjected" | "phaseRemoved", string>> {
  const errors: Partial<Record<"phaseInjected" | "phaseRemoved", string>> = {};
  if (!INJECTION_PHASES.includes(injected)) errors.phaseInjected = "Defects are not injected in this phase";
  if (!REMOVAL_PHASES.includes(removed)) errors.phaseRemoved = "Defects are not removed in this phase";
  if (!errors.phaseInjected && !errors.phaseRemoved && (order.get(removed) ?? 0) < (order.get(injected) ?? 0)) {
    errors.phaseRemoved = "A defect cannot be removed before the phase it was injected in";
  }
  return errors;
}
