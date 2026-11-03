import type { Phase } from "@/generated/prisma/enums";

/**
 * Process phase standard of Workbook v3.0 (PHASES sheet): where time is logged (LOGT), where defects are injected and
 * removed (LOGD), and which phases count as development (the SUMP defect totals and the SUMQ yields).
 */
export interface PhaseInfo {
  code: Phase;
  name: string;
  logTime: boolean;
  defectsInjected: boolean;
  defectsRemoved: boolean;
  development: boolean;
}

const p = (code: Phase, name: string, flags: string): PhaseInfo => ({
  code,
  name,
  logTime: flags[0] === "Y",
  defectsInjected: flags[1] === "Y",
  defectsRemoved: flags[2] === "Y",
  development: flags[3] === "Y",
});

/** In workbook order; flags = log time, injected, removed, counts as development. */
export const PHASES: readonly PhaseInfo[] = [
  p("MGMT", "Management & Miscellaneous", "YNNN"),
  p("STRAT", "Launch & Strategy", "YNNN"),
  p("PLAN", "Planning", "YYYY"),
  p("REQ", "Requirements / SRS", "YYYY"),
  p("STP", "System Test Plan", "YYYY"),
  p("REQINSP", "Requirements Inspection", "YYYY"),
  p("HLD", "High-Level Design / Architecture (SDD)", "YYYY"),
  p("ITP", "Integration Test Plan", "YYYY"),
  p("HLDINSP", "HLD Inspection", "YYYY"),
  p("DLD", "Detailed Design (screens, widgets, models)", "YYYY"),
  p("DLDR", "Detailed Design Review", "YYYY"),
  p("TD", "Test Development", "YYYY"),
  p("DLDINSP", "Detailed Design Inspection", "YYYY"),
  p("CODE", "Code - hand-written Dart/Flutter", "YYYY"),
  p("AIGEN", "Code - AI-assisted generation (Vibe)", "YYYY"),
  p("CR", "Code Review / Pull-Request Review", "YYYY"),
  p("BUILD", "Build & Static Analysis (flutter analyze)", "YYYY"),
  p("CODEINSP", "Code Inspection", "YYYY"),
  p("UT", "Unit Test", "YYYY"),
  p("WT", "Widget Test", "YYYY"),
  p("IT", "Build & Integration Test", "YYYY"),
  p("CICD", "CI/CD Pipeline (GitHub Actions)", "YYYY"),
  p("ST", "System Test", "YYYY"),
  p("UAT", "Client Acceptance Test", "YYYN"),
  p("DOC", "Documentation & User Manual", "YNNN"),
  p("PM", "Postmortem", "YNNN"),
  p("PL", "Product Life (post-release)", "NYYN"),
];

export function phaseName(code: Phase): string {
  return PHASES.find((p) => p.code === code)?.name ?? code;
}
