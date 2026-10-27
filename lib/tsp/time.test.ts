import { describe, expect, it } from "vitest";
import { deltaMinutes, findOverlap, formatClock, minutesToHours, parseClock, timeEntryErrors, totalHours } from "./time";

describe("clock parsing", () => {
  it("parses 24-hour HH:MM", () => {
    expect(parseClock("00:00")).toBe(0);
    expect(parseClock("09:05")).toBe(545);
    expect(parseClock("23:59")).toBe(1439);
  });
  it("rejects invalid times", () => {
    for (const v of ["24:00", "9:05", "12:60", "", "noon", "12:5"]) expect(parseClock(v)).toBeNull();
  });
  it("formats minutes", () => {
    expect(formatClock(545)).toBe("09:05");
    expect(formatClock(parseClock("17:45")!)).toBe("17:45");
  });
});

describe("LOGT delta time (stop − start − interruption)", () => {
  it("matches the workbook example", () => {
    // 14:00 to 16:30 with 20 minutes of interruptions = 130 minutes
    expect(deltaMinutes({ startMin: 14 * 60, stopMin: 16 * 60 + 30, interruptMin: 20 })).toBe(130);
  });
  it("allows no interruption", () => {
    expect(deltaMinutes({ startMin: 600, stopMin: 660, interruptMin: 0 })).toBe(60);
  });
  it("rejects stop before or equal to start", () => {
    expect(timeEntryErrors({ startMin: 600, stopMin: 600, interruptMin: 0 }).stop).toBeDefined();
    expect(() => deltaMinutes({ startMin: 700, stopMin: 600, interruptMin: 0 })).toThrow();
  });
  it("rejects interruptions as long as the session or negative", () => {
    expect(timeEntryErrors({ startMin: 600, stopMin: 660, interruptMin: 60 }).interruptMin).toBeDefined();
    expect(timeEntryErrors({ startMin: 600, stopMin: 660, interruptMin: -5 }).interruptMin).toBeDefined();
    expect(timeEntryErrors({ startMin: 600, stopMin: 660, interruptMin: 59 })).toEqual({});
  });
});

describe("hours", () => {
  it("sums deltas as hours (workbook LOGT header)", () => {
    expect(totalHours([{ deltaMin: 130 }, { deltaMin: 60 }, { deltaMin: 5 }])).toBe(3.25);
    expect(totalHours([])).toBe(0);
  });
  it("rounds to two decimals", () => {
    expect(minutesToHours(20)).toBe(0.33);
  });
});

describe("overlapping sessions", () => {
  const day = [{ startMin: 600, stopMin: 660 }, { startMin: 780, stopMin: 900 }];
  it("finds a session that overlaps", () => {
    expect(findOverlap({ startMin: 630, stopMin: 700 }, day)).toBe(day[0]);
    expect(findOverlap({ startMin: 500, stopMin: 1000 }, day)).toBe(day[0]);
  });
  it("allows back-to-back and separate sessions", () => {
    expect(findOverlap({ startMin: 660, stopMin: 780 }, day)).toBeUndefined();
    expect(findOverlap({ startMin: 900, stopMin: 960 }, day)).toBeUndefined();
  });
});
