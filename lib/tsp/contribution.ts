/**
 * Individual contribution figures (member dashboard now; lecturer monitoring in Stage 6).
 * Each measure is a count or sum per member, with the member's share of the team total and the team average.
 */
export const CONTRIBUTION_MEASURES = [
  { key: "hours", label: "Hours logged (LOGT)", unit: "h" },
  { key: "recentHours", label: "Hours, last 3 weeks", unit: "h" },
  { key: "tasksCompleted", label: "Tasks completed (TASK)", unit: "" },
  { key: "earnedValue", label: "Earned value (TASK)", unit: "%" },
  { key: "defects", label: "Defects logged (LOGD)", unit: "" },
  { key: "aiEntries", label: "AI log entries (LOGAI)", unit: "" },
  { key: "aiReviews", label: "AI reviews done for others", unit: "" },
  { key: "tests", label: "Test cases written (LOGTEST)", unit: "" },
] as const;
export type ContributionKey = (typeof CONTRIBUTION_MEASURES)[number]["key"];

export interface ContributionData {
  members: readonly { id: string; name: string }[];
  /** LOGT: hours per member per week */
  hours: readonly { memberId: string; week: number; hours: number }[];
  tasks: readonly { assigneeId: string | null; completed: boolean; planValue: number }[];
  defects: readonly { memberId: string }[];
  aiEntries: readonly { memberId: string; reviewerId: string | null; approved: boolean }[];
  tests: readonly { authorId: string }[];
  currentWeek: number;
}

export interface MemberContribution {
  memberId: string;
  name: string;
  values: Record<ContributionKey, number>;
  /** Share of the team total, 0..1 (null when the team total is 0). */
  shares: Record<ContributionKey, number | null>;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function contributions(d: ContributionData) {
  const recentFrom = d.currentWeek - 2;
  const values = (id: string): Record<ContributionKey, number> => ({
    hours: r2(d.hours.filter((h) => h.memberId === id).reduce((s, h) => s + h.hours, 0)),
    recentHours: r2(d.hours.filter((h) => h.memberId === id && h.week >= recentFrom && h.week <= d.currentWeek).reduce((s, h) => s + h.hours, 0)),
    tasksCompleted: d.tasks.filter((t) => t.assigneeId === id && t.completed).length,
    earnedValue: r2(d.tasks.filter((t) => t.assigneeId === id && t.completed).reduce((s, t) => s + t.planValue, 0) * 100),
    defects: d.defects.filter((x) => x.memberId === id).length,
    aiEntries: d.aiEntries.filter((a) => a.memberId === id).length,
    aiReviews: d.aiEntries.filter((a) => a.reviewerId === id && a.approved && a.memberId !== id).length,
    tests: d.tests.filter((t) => t.authorId === id).length,
  });
  const rows = d.members.map((m) => ({ memberId: m.id, name: m.name, values: values(m.id) }));
  const keys = CONTRIBUTION_MEASURES.map((m) => m.key);
  const totals = Object.fromEntries(keys.map((k) => [k, r2(rows.reduce((s, r) => s + r.values[k], 0))])) as Record<ContributionKey, number>;
  const n = Math.max(rows.length, 1);
  const average = Object.fromEntries(keys.map((k) => [k, r2(totals[k] / n)])) as Record<ContributionKey, number>;
  const members: MemberContribution[] = rows.map((r) => ({
    ...r,
    shares: Object.fromEntries(keys.map((k) => [k, totals[k] > 0 ? r.values[k] / totals[k] : null])) as Record<ContributionKey, number | null>,
  }));
  return { members, totals, average, fairShare: 1 / n };
}
export type Contributions = ReturnType<typeof contributions>;
