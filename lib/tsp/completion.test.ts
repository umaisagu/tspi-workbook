import { describe, expect, it } from "vitest";
import { combine, entriesStatus, milestoneCompletion, submittedStatus, type CompletionInput } from "./completion";

const due = new Date("2026-11-18T15:59:00Z");
const before = new Date("2026-11-10T10:00:00Z");
const after = new Date("2026-11-20T10:00:00Z");
const nowAfter = new Date("2026-11-25T00:00:00Z");
const nowBefore = new Date("2026-11-12T00:00:00Z");

describe("status rules", () => {
  it("submission: on time, late, missing, pending", () => {
    expect(submittedStatus(before, due, nowAfter)).toBe("complete");
    expect(submittedStatus(after, due, nowAfter)).toBe("late");
    expect(submittedStatus(null, due, nowAfter)).toBe("missing");
    expect(submittedStatus(null, due, nowBefore)).toBe("pending");
  });
  it("log entries: an entry dated before the deadline and written before it", () => {
    expect(entriesStatus([{ date: before, createdAt: before }], due, nowAfter)).toBe("complete");
    // backfilled after the deadline
    expect(entriesStatus([{ date: before, createdAt: after }], due, nowAfter)).toBe("late");
    // only entries about later dates
    expect(entriesStatus([{ date: after, createdAt: after }], due, nowAfter)).toBe("missing");
    expect(entriesStatus([], due, nowBefore)).toBe("pending");
  });
  it("combines to the worst status", () => {
    expect(combine(["complete", "late"])).toBe("late");
    expect(combine(["complete", "pending", "missing"])).toBe("missing");
    expect(combine([])).toBe("complete");
  });
});

const base: CompletionInput = {
  dueAt: due,
  requiredForms: ["SI", "LOGT", "LOGD", "PEER", "TASK", "SCHEDULE", "WEEK", "SUMP"],
  peerRequired: true,
  now: nowAfter,
  members: [
    { memberId: "a", siSubmittedAt: before, logt: [{ date: before, createdAt: before }], logd: [{ date: before, createdAt: before }], logai: [], peerSubmittedAt: before },
    { memberId: "b", siSubmittedAt: after, logt: [{ date: before, createdAt: after }], logd: [], logai: [], peerSubmittedAt: null },
  ],
  team: {
    tasks: [before],
    schedule: [before],
    logtest: [],
    sums: [],
    weekReports: [
      { week: 5, dueAt: new Date("2026-10-28T08:00:00Z"), submittedAt: new Date("2026-10-27T08:00:00Z") },
      { week: 6, dueAt: new Date("2026-11-04T08:00:00Z"), submittedAt: new Date("2026-11-05T08:00:00Z") },
      { week: 10, dueAt: new Date("2026-12-02T08:00:00Z"), submittedAt: null },
    ],
    ccr: [],
  },
};

describe("milestoneCompletion", () => {
  const c = milestoneCompletion(base);
  it("checks only the required forms", () => {
    expect(c.team.map((f) => f.form)).toEqual(["TASK", "SCHEDULE", "SUMP", "WEEK"]);
    expect(c.members[0]?.forms.map((f) => f.form)).toEqual(["SI", "LOGT", "LOGD", "PEER"]);
  });
  it("marks member forms", () => {
    expect(c.members[0]?.forms.every((f) => f.status === "complete")).toBe(true);
    expect(Object.fromEntries(c.members[1]!.forms.map((f) => [f.form, f.status]))).toEqual({ SI: "late", LOGT: "late", LOGD: "missing", PEER: "missing" });
  });
  it("marks team forms; computed SUMP needs SUMS and LOGT", () => {
    const team = Object.fromEntries(c.team.map((f) => [f.form, f.status]));
    expect(team).toEqual({ TASK: "complete", SCHEDULE: "complete", SUMP: "missing", WEEK: "late" });
  });
  it("counts late as done in the percentage", () => {
    expect(c.total).toBe(12);
    expect(c.done).toBe(9);
    expect(c.status).toBe("missing");
  });
  it("skips PEER when the milestone does not collect it", () => {
    const n = milestoneCompletion({ ...base, peerRequired: false });
    expect(n.members[0]?.forms.map((f) => f.form)).not.toContain("PEER");
  });
});
