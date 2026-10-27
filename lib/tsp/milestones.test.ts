import { describe, expect, it } from "vitest";
import { MILESTONE_DEFAULTS, milestoneDueAt } from "./milestones";

const week1 = new Date(Date.UTC(2026, 8, 21));

describe("milestone defaults", () => {
  it("has M1-M4 in order", () => {
    expect(MILESTONE_DEFAULTS.map((m) => m.code)).toEqual(["M1", "M2", "M3", "M4"]);
  });
  it("puts M1 at the Week 5 lab (Wed 21 Oct 2026, 23:59 MYT)", () => {
    const m1 = MILESTONE_DEFAULTS[0]!;
    expect(milestoneDueAt(m1, week1).toISOString()).toBe("2026-10-21T15:59:00.000Z");
  });
  it("puts M4 at the final deadline (2 Jan 2027, 10.00pm MYT)", () => {
    const m4 = MILESTONE_DEFAULTS[3]!;
    expect(milestoneDueAt(m4, week1).toISOString()).toBe("2027-01-02T14:00:00.000Z");
  });
  it("only ever adds forms from one milestone to the next", () => {
    for (let i = 1; i < MILESTONE_DEFAULTS.length; i++) {
      const prev = MILESTONE_DEFAULTS[i - 1]!.requiredForms;
      expect(prev.every((f) => MILESTONE_DEFAULTS[i]!.requiredForms.includes(f))).toBe(true);
    }
  });
});
