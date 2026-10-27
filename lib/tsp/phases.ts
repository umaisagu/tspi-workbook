import type { Phase } from "@/generated/prisma/enums";

/**
 * TSPi phases from the workbook's Phases sheet, with the flags that control where each phase is used:
 * time is logged in LOGT; defects are injected/removed in LOGD.
 */
export interface PhaseInfo {
  code: Phase;
  name: string;
  logTime: boolean;
  defectsInjected: boolean;
  defectsRemoved: boolean;
}

export const PHASES: readonly PhaseInfo[] = [
  { code: "MGMT", name: "Management and Miscellaneous", logTime: true, defectsInjected: false, defectsRemoved: false },
  { code: "STRAT", name: "Launch and Strategy", logTime: true, defectsInjected: false, defectsRemoved: false },
  { code: "PLAN", name: "Planning", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "REQ", name: "Requirements", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "STP", name: "System Test Plan", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "REQINSP", name: "REQ Inspection", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "HLD", name: "High-Level Design", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "ITP", name: "Integration Test Plan", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "HLDINSP", name: "HLD Inspection", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "DLD", name: "Detailed Design", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "DLDR", name: "DLD Review", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "TD", name: "Test Development", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "DLDINSP", name: "DLD Inspection", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "CODE", name: "Code", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "CR", name: "Code Review", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "COMPILE", name: "Compile", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "CODEINSP", name: "Code Inspection", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "UT", name: "Unit Test", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "IT", name: "Build and Integration Test", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "ST", name: "System Test", logTime: true, defectsInjected: true, defectsRemoved: true },
  { code: "DOC", name: "Documentation", logTime: true, defectsInjected: false, defectsRemoved: false },
  { code: "PM", name: "Postmortem", logTime: true, defectsInjected: false, defectsRemoved: false },
  { code: "AT", name: "Acceptance Test", logTime: false, defectsInjected: true, defectsRemoved: true },
  { code: "PL", name: "Product Life", logTime: false, defectsInjected: true, defectsRemoved: true },
];

export function phaseName(code: Phase): string {
  return PHASES.find((p) => p.code === code)?.name ?? code;
}
