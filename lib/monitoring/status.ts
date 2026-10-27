/** Team status badge on the class overview: On track / At risk / Behind, with the reasons. */
import type { Thresholds } from "./settings";

export type TeamStatus = "ON_TRACK" | "AT_RISK" | "BEHIND";

export interface TeamStatusInput {
  /** Cumulative earned value and planned value at the current week (fractions). */
  cumEV: number;
  cumPV: number;
  /** Required forms past their deadline and not done, for milestones due so far. */
  missingForms: number;
  daysSinceActivity: number | null;
  openFlags: number;
  thresholds: Thresholds;
}

/** Schedule performance index = EV / PV (null before anything is planned). */
export function spi(cumEV: number, cumPV: number): number | null {
  return cumPV > 0 ? cumEV / cumPV : null;
}

export function teamStatus(input: TeamStatusInput): { status: TeamStatus; reasons: string[] } {
  const t = input.thresholds.teamStatus;
  const s = spi(input.cumEV, input.cumPV);
  const behind: string[] = [];
  const risk: string[] = [];
  if (s !== null && s < t.behindSpi) behind.push(`Earned value ${Math.round(s * 100)}% of plan (below ${Math.round(t.behindSpi * 100)}%)`);
  else if (s !== null && s < t.atRiskSpi) risk.push(`Earned value ${Math.round(s * 100)}% of plan (below ${Math.round(t.atRiskSpi * 100)}%)`);
  if (input.daysSinceActivity === null) risk.push("No activity recorded yet");
  else if (input.daysSinceActivity > t.inactiveDays * 2) behind.push(`No activity for ${input.daysSinceActivity} days`);
  else if (input.daysSinceActivity > t.inactiveDays) risk.push(`No activity for ${input.daysSinceActivity} days`);
  if (input.missingForms > 0) risk.push(`${input.missingForms} required form${input.missingForms === 1 ? "" : "s"} missing`);
  if (input.openFlags >= 2) risk.push(`${input.openFlags} open contribution flags`);
  if (behind.length > 0) return { status: "BEHIND", reasons: [...behind, ...risk] };
  if (risk.length > 0) return { status: "AT_RISK", reasons: risk };
  return { status: "ON_TRACK", reasons: [] };
}

export const STATUS_LABEL: Record<TeamStatus, string> = { ON_TRACK: "On track", AT_RISK: "At risk", BEHIND: "Behind" };
