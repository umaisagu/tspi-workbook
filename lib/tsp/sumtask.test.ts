import { describe, expect, it } from "vitest";
import { summariseTasks, taskStatus, type SumTaskInput } from "./sumtask";

const base: Omit<SumTaskInput, "id" | "name"> = {
  phase: "CODE",
  componentName: "Login",
  assigneeId: "m1",
  assigneeName: "Aina",
  planHours: 10,
  planValue: 0.25,
  planWeek: 5,
  completedWeek: null,
  actualHours: 0,
};
const tasks: SumTaskInput[] = [
  { ...base, id: "1", name: "Code login", completedWeek: 6, actualHours: 12.5 },
  { ...base, id: "2", name: "Review login", phase: "CR", planHours: 5, planValue: 0.125, planWeek: 6, actualHours: 2 },
  { ...base, id: "3", name: "Test login", phase: "UT", assigneeId: "m2", assigneeName: "Ben", planHours: 15, planValue: 0.375, planWeek: 9, actualHours: 1 },
  { ...base, id: "4", name: "Docs", phase: "DOC", componentName: null, assigneeId: null, assigneeName: null, planWeek: 12 },
];

describe("taskStatus", () => {
  it("classifies done, overdue, in progress and not started", () => {
    expect(taskStatus({ completedWeek: 3, planWeek: 9, actualHours: 0 }, 7)).toBe("done");
    expect(taskStatus({ completedWeek: null, planWeek: 6, actualHours: 2 }, 7)).toBe("overdue");
    expect(taskStatus({ completedWeek: null, planWeek: 7, actualHours: 2 }, 7)).toBe("in_progress");
    expect(taskStatus({ completedWeek: null, planWeek: null, actualHours: 0 }, 7)).toBe("not_started");
  });
});

describe("summariseTasks", () => {
  const s = summariseTasks(tasks, 8, [{ memberId: "m1", memberName: "Aina", hours: 3.333 }], ["CODE", "CR", "UT", "DOC"]);
  it("computes deviation, CPI and lateness per task", () => {
    const [t1, t2] = s.rows;
    expect(t1).toMatchObject({ status: "done", deviationHours: 2.5, deviationPct: 0.25, cpi: 0.8, weeksLate: 1, earnedValue: 0.25 });
    expect(t2).toMatchObject({ status: "overdue", weeksLate: 2, earnedValue: 0, cpi: 2.5 });
    expect(s.rows[3]?.cpi).toBeNull();
  });
  it("rolls up totals", () => {
    expect(s.total).toMatchObject({ tasks: 4, done: 1, overdue: 1, planHours: 40, actualHours: 15.5, plannedValue: 1, earnedValue: 0.25, cpi: 2.58 });
  });
  it("groups by phase in process order", () => {
    expect(s.byPhase.map((g) => g.key)).toEqual(["CODE", "CR", "UT", "DOC"]);
  });
  it("groups by member, with unassigned tasks", () => {
    expect(s.byMember.map((g) => [g.label, g.tasks, g.earnedValue])).toEqual([
      ["Aina", 2, 0.25],
      ["Ben", 1, 0],
      ["Unassigned", 1, 0],
    ]);
  });
  it("groups by component", () => {
    expect(s.byComponent.map((g) => g.label)).toEqual(["Login", "No component"]);
  });
  it("reports LOGT time not linked to a task", () => {
    expect(s.unlinkedTotal).toBe(3.33);
  });
});
