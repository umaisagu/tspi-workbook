import { describe, expect, it } from "vitest";
import {
  backfillFlags,
  computeFlags,
  hoursWithoutOutputFlags,
  inactiveFlags,
  lowShareFlags,
  milestonePeriod,
  missingFormFlags,
  peerMismatchFlags,
  workingWeeks,
  type FlagInput,
} from "./flags";
import { DEFAULT_THRESHOLDS } from "./settings";
import { spi, teamStatus } from "./status";

const d = (s: string) => new Date(s);
const members = ["a", "b", "c", "d"].map((id, i) => ({ id, name: id.toUpperCase(), joinedWeek: 3, isLeader: i === 0 }));
const milestones = [
  { code: "M1", week: 5, dueAt: d("2026-10-21T15:59:00Z") },
  { code: "M2", week: 9, dueAt: d("2026-11-18T15:59:00Z") },
];
const base: FlagInput = {
  members,
  currentWeek: 7,
  breakWeeks: [8],
  milestones,
  hours: [],
  entries: [],
  tasks: [],
  tests: [],
  commits: [],
  githubEnabled: true,
  peer: [],
  peerStatus: [],
  weekReports: [],
  thresholds: DEFAULT_THRESHOLDS,
};
// Everyone logs 5 h a week in weeks 3–7 unless overridden.
const weekly = (ids: string[], weeks: number[], hours = 5) => ids.flatMap((memberId) => weeks.map((week) => ({ memberId, week, hours })));

describe("helpers", () => {
  it("working weeks skip breaks", () => {
    expect(workingWeeks(6, 10, [8])).toEqual([6, 7, 9, 10]);
  });
  it("finds the current milestone period", () => {
    expect(milestonePeriod(milestones, 7)).toEqual({ code: "M2", from: 6, to: 7 });
    expect(milestonePeriod(milestones, 4)).toEqual({ code: "M1", from: 1, to: 4 });
  });
});

describe("LOW_SHARE", () => {
  it("flags a member under 50% of the fair share of hours, with the numbers", () => {
    const f = lowShareFlags({ ...base, hours: [...weekly(["a", "b", "c"], [5, 6, 7]), ...weekly(["d"], [5, 6, 7], 1)] });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ memberId: "d", type: "LOW_SHARE", periodKey: "M2" });
    // 3 h of 48 h = 6%; fair share 25%, flag below 13%
    expect(f[0]!.evidence[0]).toContain("Hours, last 3 weeks (weeks 5–7): 6% of the team (3 h of 48 h); fair share 25%, flag below 13%.");
  });
  it("flags a low share of earned value", () => {
    const tasks = [
      { assigneeId: "a", planValue: 0.3, completedWeek: 6 },
      { assigneeId: "b", planValue: 0.3, completedWeek: 6 },
      { assigneeId: "c", planValue: 0.3, completedWeek: 7 },
      { assigneeId: "d", planValue: 0.02, completedWeek: 7 },
    ];
    const f = lowShareFlags({ ...base, hours: weekly(["a", "b", "c", "d"], [5, 6, 7]), tasks });
    expect(f.map((x) => x.memberId)).toEqual(["d"]);
    expect(f[0]!.evidence.some((l) => l.startsWith("Earned value"))).toBe(true);
  });
  it("does not flag an even team or a team with no data", () => {
    expect(lowShareFlags({ ...base, hours: weekly(["a", "b", "c", "d"], [5, 6, 7]) })).toEqual([]);
    expect(lowShareFlags(base)).toEqual([]);
  });
});

describe("INACTIVE", () => {
  it("flags 2 consecutive working weeks without LOGT, skipping the break week", () => {
    const hours = [...weekly(["a", "b", "c"], [3, 4, 5, 6, 7, 9]), ...weekly(["d"], [3, 4, 5])];
    const f = inactiveFlags({ ...base, currentWeek: 9, hours });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ memberId: "d", periodKey: "W6-W9" });
    expect(f[0]!.evidence).toEqual(["No time logged in weeks 6–9 (week 9 still in progress).", "Last week with time logged: week 5."]);
  });
  it("does not flag a single missed week", () => {
    expect(inactiveFlags({ ...base, hours: [...weekly(["a", "b", "c"], [3, 4, 5, 6, 7]), ...weekly(["d"], [3, 4, 5, 7])] })).toEqual([]);
  });
  it("ignores weeks before the member joined", () => {
    const late = { ...base, members: [...members.slice(0, 3), { ...members[3]!, joinedWeek: 7 }], hours: [...weekly(["a", "b", "c"], [3, 4, 5, 6, 7]), ...weekly(["d"], [7])] };
    expect(inactiveFlags(late)).toEqual([]);
  });
});

describe("HOURS_NO_OUTPUT", () => {
  const hours = weekly(["a", "b"], [5, 6, 7], 4);
  it("flags hours with no tasks, tests or commits in the window", () => {
    const f = hoursWithoutOutputFlags({ ...base, hours, tasks: [{ assigneeId: "a", planValue: 0.1, completedWeek: 6 }] });
    expect(f.map((x) => x.memberId)).toEqual(["b"]);
    expect(f[0]!.evidence[0]).toBe("Weeks 5–7: 12 h in LOGT.");
  });
  it("counts test cases and commits as output", () => {
    expect(hoursWithoutOutputFlags({ ...base, hours, tests: [{ authorId: "a", week: 7 }], commits: [{ memberId: "b", week: 5 }] })).toEqual([]);
  });
  it("ignores commits when GitHub is not connected", () => {
    expect(hoursWithoutOutputFlags({ ...base, hours, githubEnabled: false, commits: [{ memberId: "b", week: 5 }] }).map((x) => x.memberId)).toEqual(["a", "b"]);
  });
  it("needs a minimum number of hours", () => {
    expect(hoursWithoutOutputFlags({ ...base, hours: weekly(["a"], [7], 2) })).toEqual([]);
  });
});

describe("BACKFILL", () => {
  // 6 LOGT entries for early October, all typed on the evening of the M1 deadline (21 Oct, 21:09–21:54 MYT)
  const entries = [1, 2, 3, 4, 5, 6].map((i) => ({
    memberId: "b",
    form: "LOGT",
    date: d(`2026-10-0${i + 1}T00:00:00Z`),
    createdAt: d(`2026-10-21T13:${String(i * 9).padStart(2, "0")}:00Z`),
  }));
  it("flags a sitting of past-dated entries shortly before a deadline", () => {
    const f = backfillFlags({ ...base, entries });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ memberId: "b", type: "BACKFILL", periodKey: "M1" });
    expect(f[0]!.evidence[0]).toBe("6 entries (6 LOGT) for 2 Oct 2026 – 7 Oct 2026.");
    expect(f[0]!.evidence[2]).toContain("M1 was due");
  });
  it("does not flag entries typed on time, small sittings, or sittings far from a deadline", () => {
    const onTime = entries.map((e) => ({ ...e, createdAt: new Date(e.date.getTime() + 12 * 3600_000) }));
    expect(backfillFlags({ ...base, entries: onTime })).toEqual([]);
    expect(backfillFlags({ ...base, entries: entries.slice(0, 4) })).toEqual([]);
    const early = entries.map((e) => ({ ...e, createdAt: new Date(e.createdAt.getTime() - 10 * 86_400_000) }));
    expect(backfillFlags({ ...base, entries: early })).toEqual([]);
  });
  it("splits sittings at long gaps", () => {
    const split = entries.map((e, i) => ({ ...e, createdAt: new Date(e.createdAt.getTime() + (i >= 3 ? 5 * 3600_000 : 0)) }));
    expect(backfillFlags({ ...base, entries: split })).toEqual([]);
  });
});

describe("PEER_MISMATCH", () => {
  const peer = [
    { milestone: "M1", evaluatorId: "d", evaluateeId: "d", total: 50 },
    { milestone: "M1", evaluatorId: "a", evaluateeId: "d", total: 24 },
    { milestone: "M1", evaluatorId: "b", evaluateeId: "d", total: 26 },
    { milestone: "M1", evaluatorId: "a", evaluateeId: "a", total: 40 },
    { milestone: "M1", evaluatorId: "b", evaluateeId: "a", total: 38 },
  ];
  it("flags a self-rating well above the teammates' average", () => {
    const f = peerMismatchFlags({ ...base, peer });
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ memberId: "d", periodKey: "M1", summary: "Self-rating well above teammates' ratings" });
    expect(f[0]!.evidence[0]).toBe("M1: self-rating 50/50 vs teammates' average 25/50 (2 ratings) — 25 points above; flag at 10.");
    // average 25 is also at the low threshold
    expect(f[0]!.evidence[1]).toContain("teammates' average 25/50 from 2 ratings");
  });
  it("needs two ratings before calling peer ratings low", () => {
    const one = [{ milestone: "M1", evaluatorId: "a", evaluateeId: "c", total: 15 }];
    expect(peerMismatchFlags({ ...base, peer: one })).toEqual([]);
  });
});

describe("MISSING_FORMS", () => {
  it("flags missing or late WEEK reports on the Team Leader and PEER on the member", () => {
    const f = missingFormFlags({
      ...base,
      weekReports: [
        { week: 5, status: "late" },
        { week: 6, status: "submitted" },
        { week: 7, status: "open" },
      ],
      peerStatus: [
        { milestone: "M1", memberId: "c", status: "missing" },
        { milestone: "M1", memberId: "b", status: "submitted" },
      ],
    });
    expect(f.map((x) => [x.memberId, x.periodKey, x.summary])).toEqual([
      ["a", "WEEK-W5", "WEEK report for week 5 submitted late"],
      ["c", "PEER-M1", "PEER evaluation for M1 not submitted"],
    ]);
  });
  it("can be switched off", () => {
    const off = { ...DEFAULT_THRESHOLDS, missingForms: { week: false, peer: false } };
    expect(missingFormFlags({ ...base, thresholds: off, weekReports: [{ week: 5, status: "missing" }] })).toEqual([]);
  });
});

describe("computeFlags", () => {
  it("combines all flag types", () => {
    const f = computeFlags({ ...base, currentWeek: 9, hours: [...weekly(["a", "b", "c"], [3, 4, 5, 6, 7, 9]), ...weekly(["d"], [3, 4, 5])] });
    // nobody completed tasks, tests or commits either, so hours-without-output fires too
    expect(new Set(f.map((x) => x.type))).toEqual(new Set(["INACTIVE", "LOW_SHARE", "HOURS_NO_OUTPUT"]));
  });
});

describe("team status", () => {
  const t = DEFAULT_THRESHOLDS;
  it("schedule performance index", () => {
    expect(spi(0.3, 0.4)).toBeCloseTo(0.75);
    expect(spi(0, 0)).toBeNull();
  });
  it("on track, at risk and behind", () => {
    expect(teamStatus({ cumEV: 0.38, cumPV: 0.4, missingForms: 0, daysSinceActivity: 1, openFlags: 0, thresholds: t })).toEqual({ status: "ON_TRACK", reasons: [] });
    const risk = teamStatus({ cumEV: 0.34, cumPV: 0.4, missingForms: 1, daysSinceActivity: 2, openFlags: 0, thresholds: t });
    expect(risk.status).toBe("AT_RISK");
    expect(risk.reasons).toEqual(["Earned value 85% of plan (below 90%)", "1 required form missing"]);
    expect(teamStatus({ cumEV: 0.2, cumPV: 0.4, missingForms: 0, daysSinceActivity: 1, openFlags: 0, thresholds: t }).status).toBe("BEHIND");
    expect(teamStatus({ cumEV: 0.4, cumPV: 0.4, missingForms: 0, daysSinceActivity: 15, openFlags: 0, thresholds: t }).status).toBe("BEHIND");
  });
});
