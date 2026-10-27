import { describe, expect, it } from "vitest";
import { aiLogSchema, defectLogSchema, studentInfoSchema, timeLogSchema } from "./forms";
import { COMMITMENT_DAYS, COMMITMENT_SLOTS, SKILL_AREAS } from "@/lib/tsp/student-info";

describe("LOGT schema", () => {
  const base = { date: "2026-10-07", start: "14:00", stop: "16:30", interruptMin: "20", phase: "REQ" };
  it("accepts a valid entry and coerces numbers", () => {
    const r = timeLogSchema.parse(base);
    expect(r.interruptMin).toBe(20);
    expect(r.componentId).toBeNull();
  });
  it("reports stop-before-start on the stop field", () => {
    const r = timeLogSchema.safeParse({ ...base, stop: "13:00" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.path.join("."))).toContain("stop");
  });
  it("rejects phases where time is not logged (AT, PL)", () => {
    expect(timeLogSchema.safeParse({ ...base, phase: "AT" }).success).toBe(false);
  });
  it("rejects bad dates and times", () => {
    expect(timeLogSchema.safeParse({ ...base, date: "2026-02-30" }).success).toBe(false);
    expect(timeLogSchema.safeParse({ ...base, start: "2pm" }).success).toBe(false);
  });
});

describe("LOGD schema", () => {
  const base = { date: "2026-10-20", type: "80", phaseInjected: "CODE", phaseRemoved: "UT", fixTimeMin: "15", description: "Null check missing" };
  it("accepts a valid defect", () => {
    expect(defectLogSchema.parse(base).type).toBe(80);
  });
  it("rejects unknown types and removal before injection", () => {
    expect(defectLogSchema.safeParse({ ...base, type: "85" }).success).toBe(false);
    const r = defectLogSchema.safeParse({ ...base, phaseInjected: "UT", phaseRemoved: "CODE" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(["phaseRemoved"]);
  });
});

describe("LOGAI schema", () => {
  const base = {
    date: "2026-10-28",
    module: "FR-03 Order Summary",
    tool: "Claude",
    model: "claude-sonnet",
    promptSpec: "Spec...",
    outputSummary: "Screen and route",
    humanRefinement: "Renamed widgets, removed unused state",
    testEvidence: "widget_test order_summary passes",
  };
  it("accepts an entry without a PR yet", () => {
    expect(aiLogSchema.parse(base).prUrl).toBeNull();
  });
  it("requires a GitHub PR link when given", () => {
    expect(aiLogSchema.safeParse({ ...base, prUrl: "https://example.com/x" }).success).toBe(false);
    expect(aiLogSchema.safeParse({ ...base, prUrl: "https://github.com/org/repo/pull/12" }).success).toBe(true);
  });
  it("requires the human refinement", () => {
    expect(aiLogSchema.safeParse({ ...base, humanRefinement: " " }).success).toBe(false);
  });
});

describe("FORM-SI schema", () => {
  const grid = Object.fromEntries(COMMITMENT_SLOTS.map((s) => [s, Object.fromEntries(COMMITMENT_DAYS.map((d) => [d, ""]))]));
  const valid = {
    fullName: "Aina Sofea",
    matricNo: "84001",
    date: "2026-10-07",
    programme: "Software Engineering",
    yearOfStudy: "3",
    creditsRegistered: "18",
    githubUsername: "aina-sofea",
    skills: Object.fromEntries(SKILL_AREAS.map((s) => [s.key, { rating: "3", evidence: "" }])),
    resources: { laptopCanRunEmulator: true },
    residence: "Kota Samarahan",
    ownTransport: false,
    meetingAvailability: ["Saturdays"],
    weeklyCommitments: grid,
    rolePreferences: { TEAM_LEADER: 5, DEVELOPMENT_MANAGER: 3, PLANNING_MANAGER: 2, QUALITY_PROCESS_MANAGER: 1, SUPPORT_MANAGER: 1 },
    declared: true,
  };
  it("accepts a complete sheet", () => {
    const r = studentInfoSchema.safeParse(valid);
    expect(r.error?.issues).toBeUndefined();
  });
  it("needs all five roles ranked, a valid GitHub username and the declaration", () => {
    const r = studentInfoSchema.safeParse({ ...valid, rolePreferences: { TEAM_LEADER: 5 }, githubUsername: "-bad-", declared: false });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toEqual(expect.arrayContaining(["rolePreferences.SUPPORT_MANAGER", "githubUsername", "declared"]));
    }
  });
  it("needs a place when residence is Other", () => {
    const r = studentInfoSchema.safeParse({ ...valid, residence: "Other" });
    expect(r.success).toBe(false);
  });
});
