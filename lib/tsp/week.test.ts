import { describe, expect, it } from "vitest";
import { reportWeeks, submissionStatus, weekReport, weekReportDueAt, type WeekTask } from "./week";

const task = (id: string, assigneeId: string, planWeek: number | null, completedWeek: number | null, planValue: number, planHours = 10, actualHours = 0): WeekTask => ({
  id,
  name: id,
  phase: "CODE",
  assigneeId,
  planHours,
  actualHours,
  planValue,
  planWeek,
  completedWeek,
});

const input = {
  week: 6,
  members: [
    { id: "a", name: "Aina", roles: ["TEAM_LEADER"] },
    { id: "b", name: "Ben", roles: ["DEVELOPMENT_MANAGER"] },
  ],
  schedule: new Map([
    ["a", new Map([[5, 5], [6, 5], [7, 5]])],
    ["b", new Map([[5, 6], [6, 6]])],
  ]),
  logs: [
    { memberId: "a", week: 5, hours: 4 },
    { memberId: "a", week: 6, hours: 6 },
    { memberId: "b", week: 6, hours: 2 },
  ],
  tasks: [
    task("t1", "a", 5, 5, 0.2, 10, 12),
    task("t2", "b", 6, 6, 0.3, 8, 6),
    task("t3", "b", 6, null, 0.1),
    task("t4", "a", 7, null, 0.4),
  ],
};

describe("weekReport", () => {
  const r = weekReport(input);
  it("schedule hours this week and to date (plan from SCHEDULE, actual from LOGT)", () => {
    expect(r.scheduleHours.thisWeek).toEqual({ plan: 11, actual: 8, ratio: 1.38 });
    expect(r.scheduleHours.toDate).toMatchObject({ plan: 22, actual: 12 });
  });
  it("earned value this week and to date", () => {
    expect(r.earnedValue.thisWeek).toMatchObject({ plan: 0.4, actual: 0.3 });
    expect(r.earnedValue.toDate).toMatchObject({ plan: 0.6, actual: 0.5 });
  });
  it("hours of completed tasks and average hours per week", () => {
    expect(r.completedTaskHours).toMatchObject({ plan: 18, actual: 18 });
    expect(r.averageHoursPerWeek).toMatchObject({ plan: 3.67, actual: 2 });
  });
  it("per-member figures for the week", () => {
    expect(r.members).toEqual([
      { id: "a", name: "Aina", roles: ["TEAM_LEADER"], planHours: 5, actualHours: 6, plannedValue: 0, earnedValue: 0 },
      { id: "b", name: "Ben", roles: ["DEVELOPMENT_MANAGER"], planHours: 6, actualHours: 2, plannedValue: 0.4, earnedValue: 0.3 },
    ]);
  });
  it("lists tasks completed this week and tasks due but still open", () => {
    expect(r.tasksCompleted.map((t) => t.id)).toEqual(["t2"]);
    expect(r.tasksDue.map((t) => t.id)).toEqual(["t3"]);
  });
});

describe("report weeks and due dates", () => {
  it("runs from week 5 to the current week, skipping breaks", () => {
    expect(reportWeeks(10, 15, [8])).toEqual([5, 6, 7, 9, 10]);
    expect(reportWeeks(4, 15, [8])).toEqual([]);
  });
  it("is due before the next Wednesday lab (16:00 MYT)", () => {
    const week1 = new Date(Date.UTC(2026, 8, 21));
    // week 5 report → Wed 28 Oct 2026 16:00 MYT = 08:00 UTC
    expect(weekReportDueAt(5, week1).toISOString()).toBe("2026-10-28T08:00:00.000Z");
  });
  it("classifies submissions", () => {
    const due = new Date("2026-10-28T08:00:00Z");
    expect(submissionStatus(new Date("2026-10-27T10:00:00Z"), due, new Date())).toBe("submitted");
    expect(submissionStatus(new Date("2026-10-29T10:00:00Z"), due, new Date())).toBe("late");
    expect(submissionStatus(null, due, new Date("2026-10-30T00:00:00Z"))).toBe("missing");
    expect(submissionStatus(null, due, new Date("2026-10-27T00:00:00Z"))).toBe("open");
  });
});
