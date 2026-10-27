/**
 * Contribution flags. Each flag is a prompt for the lecturer to review — never a grade — and carries
 * its evidence (the numbers and the weeks). Thresholds come from settings.ts.
 */
import type { FlagType } from "@/generated/prisma/enums";
import type { Thresholds } from "./settings";

export interface FlagMember {
  id: string;
  name: string;
  /** Semester week the member joined (weeks before it are not judged). */
  joinedWeek: number;
  isLeader: boolean;
}

export interface FlagInput {
  members: readonly FlagMember[];
  currentWeek: number;
  breakWeeks: readonly number[];
  /** Milestones sorted by due date. */
  milestones: readonly { code: string; week: number; dueAt: Date }[];
  /** LOGT hours by member and week of the entry date. */
  hours: readonly { memberId: string; week: number; hours: number }[];
  /** Log entries with the date they describe and when they were typed (LOGT, LOGD, LOGAI, LOGTEST). */
  entries: readonly { memberId: string; form: string; date: Date; createdAt: Date }[];
  tasks: readonly { assigneeId: string | null; planValue: number; completedWeek: number | null }[];
  tests: readonly { authorId: string; week: number }[];
  commits: readonly { memberId: string; week: number }[];
  githubEnabled: boolean;
  /** Submitted PEER totals (out of 50) per milestone. */
  peer: readonly { milestone: string; evaluatorId: string; evaluateeId: string; total: number }[];
  /** PEER status per member per milestone that collects it. */
  peerStatus: readonly { milestone: string; memberId: string; status: "submitted" | "late" | "missing" | "open" }[];
  weekReports: readonly { week: number; status: "submitted" | "late" | "missing" | "open" }[];
  thresholds: Thresholds;
}

export interface Flag {
  memberId: string;
  type: FlagType;
  /** Identifies the period, e.g. "M2", "W5-W6", "WEEK-W7", "PEER-M2". */
  periodKey: string;
  summary: string;
  evidence: string[];
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const h = (v: number) => `${Math.round(v * 10) / 10} h`;
const DAY = 86_400_000;

/** Working weeks in [from, to], skipping breaks. */
export function workingWeeks(from: number, to: number, breakWeeks: readonly number[]): number[] {
  const out: number[] = [];
  for (let w = Math.max(1, from); w <= to; w++) if (!breakWeeks.includes(w)) out.push(w);
  return out;
}

/** The milestone being worked towards at `week`, and the first week of its period. */
export function milestonePeriod(milestones: FlagInput["milestones"], week: number): { code: string; from: number; to: number } | null {
  const idx = milestones.findIndex((m) => m.week >= week);
  const m = milestones[idx === -1 ? milestones.length - 1 : idx];
  if (!m) return null;
  const prev = idx > 0 ? milestones[idx - 1] : idx === -1 ? milestones[milestones.length - 2] : undefined;
  return { code: m.code, from: prev ? prev.week + 1 : 1, to: Math.min(week, m.week) };
}

// ---------- LOW_SHARE ----------

export function lowShareFlags(input: FlagInput): Flag[] {
  const { members, thresholds: t } = input;
  if (members.length < 2) return [];
  const fair = 1 / members.length;
  const limit = t.lowShare.fraction * fair;
  const period = milestonePeriod(input.milestones, input.currentWeek);
  const windows = [
    { label: `last ${t.lowShare.windowWeeks} weeks`, from: input.currentWeek - t.lowShare.windowWeeks + 1, to: input.currentWeek },
    ...(period ? [{ label: `${period.code} so far`, from: period.from, to: period.to }] : []),
  ];
  const flags: Flag[] = [];
  for (const m of members) {
    const lines: string[] = [];
    for (const win of windows) {
      const inWin = (w: number) => w >= win.from && w <= win.to;
      const hoursOf = (id: string) => input.hours.filter((x) => x.memberId === id && inWin(x.week)).reduce((s, x) => s + x.hours, 0);
      const evOf = (id: string) =>
        input.tasks.filter((x) => x.assigneeId === id && x.completedWeek !== null && inWin(x.completedWeek)).reduce((s, x) => s + x.planValue, 0);
      for (const [label, of] of [
        ["hours", hoursOf],
        ["earned value", evOf],
      ] as const) {
        const total = members.reduce((s, x) => s + of(x.id), 0);
        if (total <= 0) continue;
        const mine = of(m.id);
        const share = mine / total;
        if (share < limit) {
          lines.push(
            `${label[0]!.toUpperCase()}${label.slice(1)}, ${win.label} (weeks ${Math.max(win.from, 1)}–${win.to}): ${pct(share)} of the team (${label === "hours" ? h(mine) : pct(mine)} of ${label === "hours" ? h(total) : pct(total)}); fair share ${pct(fair)}, flag below ${pct(limit)}.`,
          );
        }
      }
    }
    if (lines.length > 0) {
      flags.push({ memberId: m.id, type: "LOW_SHARE", periodKey: period?.code ?? `W${input.currentWeek}`, summary: `Low share of the team's ${lines.some((l) => l.startsWith("Hours")) ? "hours" : "earned value"}`, evidence: lines });
    }
  }
  return flags;
}

// ---------- INACTIVE ----------

export function inactiveFlags(input: FlagInput): Flag[] {
  const n = input.thresholds.inactive.weeks;
  const flags: Flag[] = [];
  for (const m of input.members) {
    const weeks = workingWeeks(Math.max(3, m.joinedWeek), input.currentWeek, input.breakWeeks);
    let run: number[] = [];
    const runs: number[][] = [];
    for (const w of weeks) {
      const any = input.hours.some((x) => x.memberId === m.id && x.week === w && x.hours > 0);
      if (any) {
        if (run.length >= n) runs.push(run);
        run = [];
      } else run.push(w);
    }
    if (run.length >= n) runs.push(run);
    for (const r of runs) {
      const first = r[0]!;
      const last = r[r.length - 1]!;
      const lastLogged = input.hours.filter((x) => x.memberId === m.id && x.week < first && x.hours > 0).reduce((mx, x) => Math.max(mx, x.week), 0);
      flags.push({
        memberId: m.id,
        type: "INACTIVE",
        periodKey: `W${first}-W${last}`,
        summary: `No LOGT entries for ${r.length} consecutive weeks`,
        evidence: [
          `No time logged in weeks ${first}–${last}${last === input.currentWeek ? ` (week ${last} still in progress)` : ""}.`,
          lastLogged ? `Last week with time logged: week ${lastLogged}.` : "No time logged before this period.",
        ],
      });
    }
  }
  return flags;
}

// ---------- HOURS_NO_OUTPUT ----------

export function hoursWithoutOutputFlags(input: FlagInput): Flag[] {
  const t = input.thresholds.hoursWithoutOutput;
  const from = input.currentWeek - t.windowWeeks + 1;
  const inWin = (w: number) => w >= from && w <= input.currentWeek;
  const period = milestonePeriod(input.milestones, input.currentWeek);
  const flags: Flag[] = [];
  for (const m of input.members) {
    const hours = input.hours.filter((x) => x.memberId === m.id && inWin(x.week)).reduce((s, x) => s + x.hours, 0);
    if (hours < t.minHours) continue;
    const tasks = input.tasks.filter((x) => x.assigneeId === m.id && x.completedWeek !== null && inWin(x.completedWeek)).length;
    const tests = input.tests.filter((x) => x.authorId === m.id && inWin(x.week)).length;
    const commits = input.commits.filter((x) => x.memberId === m.id && inWin(x.week)).length;
    if (tasks > 0 || tests > 0 || (input.githubEnabled && commits > 0)) continue;
    flags.push({
      memberId: m.id,
      type: "HOURS_NO_OUTPUT",
      periodKey: period?.code ?? `W${input.currentWeek}`,
      summary: `${h(hours)} logged but no completed tasks${input.githubEnabled ? ", commits" : ""} or test cases`,
      evidence: [
        `Weeks ${Math.max(from, 1)}–${input.currentWeek}: ${h(hours)} in LOGT.`,
        `Tasks completed: 0 · test cases written: 0${input.githubEnabled ? " · GitHub commits: 0" : " · GitHub not connected"}.`,
      ],
    });
  }
  return flags;
}

// ---------- BACKFILL ----------

const fmt = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuching" });
const fmtDate = new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "UTC" });

export function backfillFlags(input: FlagInput): Flag[] {
  const t = input.thresholds.backfill;
  const flags: Flag[] = [];
  for (const m of input.members) {
    // Backdated: typed lagDays or more after the date it describes (log dates are calendar dates; compare by day).
    const late = input.entries
      .filter((e) => e.memberId === m.id && e.createdAt.getTime() + 8 * 3600_000 - e.date.getTime() >= t.lagDays * DAY)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const sessions: (typeof late)[] = [];
    for (const e of late) {
      const s = sessions.at(-1);
      if (s && e.createdAt.getTime() - s.at(-1)!.createdAt.getTime() <= t.sessionGapMinutes * 60_000) s.push(e);
      else sessions.push([e]);
    }
    for (const s of sessions) {
      if (s.length < t.minEntries) continue;
      const end = s.at(-1)!.createdAt;
      const deadline = input.milestones.find((ms) => ms.dueAt >= end && ms.dueAt.getTime() - end.getTime() <= t.daysBeforeDeadline * DAY);
      if (!deadline) continue;
      const byForm = Object.entries(s.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.form]: (acc[e.form] ?? 0) + 1 }), {}))
        .map(([f, c]) => `${c} ${f}`)
        .join(", ");
      const dates = s.map((e) => e.date.getTime());
      flags.push({
        memberId: m.id,
        type: "BACKFILL",
        periodKey: deadline.code,
        summary: `${s.length} past-dated entries typed in one sitting before the ${deadline.code} deadline`,
        evidence: [
          `${s.length} entries (${byForm}) for ${fmtDate.format(new Date(Math.min(...dates)))} – ${fmtDate.format(new Date(Math.max(...dates)))}.`,
          `All typed between ${fmt.format(s[0]!.createdAt)} and ${fmt.format(end)}.`,
          `${deadline.code} was due ${fmt.format(deadline.dueAt)}.`,
        ],
      });
    }
  }
  return flags;
}

// ---------- PEER_MISMATCH ----------

export function peerMismatchFlags(input: FlagInput): Flag[] {
  const t = input.thresholds.peerMismatch;
  const flags: Flag[] = [];
  const milestones = [...new Set(input.peer.map((p) => p.milestone))];
  for (const m of input.members) {
    const history: { milestone: string; avg: number; count: number }[] = [];
    for (const ms of milestones) {
      const self = input.peer.find((p) => p.milestone === ms && p.evaluatorId === m.id && p.evaluateeId === m.id);
      const received = input.peer.filter((p) => p.milestone === ms && p.evaluateeId === m.id && p.evaluatorId !== m.id);
      if (received.length === 0) continue;
      const avg = received.reduce((s, p) => s + p.total, 0) / received.length;
      history.push({ milestone: ms, avg, count: received.length });
      const lines: string[] = [];
      if (self && self.total - avg >= t.selfAbovePeers) {
        lines.push(`${ms}: self-rating ${self.total}/50 vs teammates' average ${Math.round(avg * 10) / 10}/50 (${received.length} ratings) — ${Math.round((self.total - avg) * 10) / 10} points above; flag at ${t.selfAbovePeers}.`);
      }
      if (received.length >= 2 && avg <= t.lowPeerAverage) {
        const lowSoFar = history.filter((x) => x.avg <= t.lowPeerAverage).length;
        lines.push(
          `${ms}: teammates' average ${Math.round(avg * 10) / 10}/50 from ${received.length} ratings (flag at ${t.lowPeerAverage} or below)${lowSoFar > 1 ? `; low at ${lowSoFar} milestones so far` : ""}.`,
        );
      }
      if (lines.length > 0) {
        flags.push({
          memberId: m.id,
          type: "PEER_MISMATCH",
          periodKey: ms,
          summary: lines.some((l) => l.includes("self-rating")) ? "Self-rating well above teammates' ratings" : "Low ratings from teammates",
          evidence: lines,
        });
      }
    }
  }
  return flags;
}

// ---------- MISSING_FORMS ----------

export function missingFormFlags(input: FlagInput): Flag[] {
  const t = input.thresholds.missingForms;
  const flags: Flag[] = [];
  if (t.week) {
    for (const r of input.weekReports.filter((x) => x.status === "missing" || x.status === "late")) {
      for (const m of input.members.filter((x) => x.isLeader)) {
        flags.push({
          memberId: m.id,
          type: "MISSING_FORMS",
          periodKey: `WEEK-W${r.week}`,
          summary: `WEEK report for week ${r.week} ${r.status === "late" ? "submitted late" : "not submitted"}`,
          evidence: [`The Team Leader submits the weekly status report; week ${r.week} is ${r.status}.`],
        });
      }
    }
  }
  if (t.peer) {
    for (const p of input.peerStatus.filter((x) => x.status === "missing" || x.status === "late")) {
      flags.push({
        memberId: p.memberId,
        type: "MISSING_FORMS",
        periodKey: `PEER-${p.milestone}`,
        summary: `PEER evaluation for ${p.milestone} ${p.status === "late" ? "submitted late" : "not submitted"}`,
        evidence: [`PEER for ${p.milestone} is ${p.status}.`],
      });
    }
  }
  return flags;
}

export function computeFlags(input: FlagInput): Flag[] {
  return [
    ...lowShareFlags(input),
    ...inactiveFlags(input),
    ...hoursWithoutOutputFlags(input),
    ...backfillFlags(input),
    ...peerMismatchFlags(input),
    ...missingFormFlags(input),
  ];
}

export const FLAG_LABELS: Record<FlagType, string> = {
  LOW_SHARE: "Low share",
  INACTIVE: "Inactive",
  HOURS_NO_OUTPUT: "Hours without output",
  BACKFILL: "Backfilling",
  PEER_MISMATCH: "Peer mismatch",
  MISSING_FORMS: "Missing forms",
};

export const flagKey = (f: Pick<Flag, "memberId" | "type" | "periodKey">) => `${f.memberId}|${f.type}|${f.periodKey}`;
