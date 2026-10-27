import { describe, expect, it } from "vitest";
import { localDate, myTime, parseDateOnly, weekEnd, weekOf, weekStart, formatDateOnly, isMonday } from "./calendar";

const week1 = new Date(Date.UTC(2026, 8, 21)); // Mon 21 Sep 2026

describe("semester calendar", () => {
  it("puts Lab 01 (Wed 7 Oct 2026) in week 3", () => {
    expect(weekOf(new Date(Date.UTC(2026, 9, 7)), week1)).toBe(3);
  });
  it("treats Monday as the first day and Sunday as the last day of a week", () => {
    expect(weekOf(new Date(Date.UTC(2026, 9, 5)), week1)).toBe(3);
    expect(weekOf(new Date(Date.UTC(2026, 9, 11)), week1)).toBe(3);
    expect(weekOf(new Date(Date.UTC(2026, 9, 12)), week1)).toBe(4);
  });
  it("gives 0 for the week before the semester", () => {
    expect(weekOf(new Date(Date.UTC(2026, 8, 20)), week1)).toBe(0);
  });
  it("ignores the time of day", () => {
    expect(weekOf(new Date(Date.UTC(2026, 9, 11, 23, 59)), week1)).toBe(3);
  });
  it("puts the final submission (2 Jan 2027) in week 15", () => {
    expect(weekOf(new Date(Date.UTC(2027, 0, 2)), week1)).toBe(15);
  });
  it("computes week start and end dates", () => {
    expect(formatDateOnly(weekStart(8, week1))).toBe("2026-11-09");
    expect(formatDateOnly(weekEnd(8, week1))).toBe("2026-11-15");
  });
  it("converts instants to the Malaysian calendar date", () => {
    // 16:30 UTC on 4 Oct is 00:30 on 5 Oct in Kuching
    expect(formatDateOnly(localDate(new Date(Date.UTC(2026, 9, 4, 16, 30))))).toBe("2026-10-05");
  });
  it("builds instants from Malaysian local time", () => {
    expect(myTime(new Date(Date.UTC(2027, 0, 2)), 22, 0).toISOString()).toBe("2027-01-02T14:00:00.000Z");
  });
  it("parses only valid YYYY-MM-DD dates", () => {
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("21/09/2026")).toBeNull();
    expect(parseDateOnly("2026-09-21")?.getTime()).toBe(week1.getTime());
    expect(isMonday(week1)).toBe(true);
  });
});
