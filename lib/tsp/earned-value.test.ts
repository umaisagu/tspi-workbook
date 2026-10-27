import { describe, expect, it } from "vitest";
import { buildSchedule, estimatedHours, planTasks, type PlanTask } from "./earned-value";

const tasks: PlanTask[] = [
  { id: "a", order: 1, planHours: 10, completedWeek: 2 },
  { id: "b", order: 2, planHours: 20, completedWeek: 3 },
  { id: "c", order: 3, planHours: 30, completedWeek: null },
  { id: "d", order: 4, planHours: 40, completedWeek: null },
];
// 25 planned hours per week in weeks 1-4
const schedule = new Map([
  [1, 25],
  [2, 25],
  [3, 25],
  [4, 25],
]);

describe("estimated hours (size / rate)", () => {
  it("divides size by rate", () => {
    expect(estimatedHours(400, 20)).toBe(20);
  });
  it("is null without both values or with rate 0", () => {
    expect(estimatedHours(null, 20)).toBeNull();
    expect(estimatedHours(100, 0)).toBeNull();
  });
});

describe("planTasks", () => {
  const r = planTasks(tasks, schedule);
  it("gives each task PV = plan hours / total plan hours", () => {
    expect(r.map((t) => t.planValue)).toEqual([0.1, 0.2, 0.3, 0.4]);
  });
  it("accumulates plan hours and plan value in plan order", () => {
    expect(r.map((t) => t.cumPlanHours)).toEqual([10, 30, 60, 100]);
    expect(r.at(-1)?.cumPlanValue).toBe(1);
  });
  it("places each task in the first week whose cumulative schedule hours cover it", () => {
    // cum schedule: 25, 50, 75, 100
    expect(r.map((t) => t.planWeek)).toEqual([1, 2, 3, 4]);
  });
  it("earns value only for completed tasks", () => {
    expect(r.map((t) => t.earnedValue)).toEqual([0.1, 0.2, 0, 0]);
  });
  it("follows the order field, not the input order", () => {
    const shuffled = [tasks[2]!, tasks[0]!, tasks[3]!, tasks[1]!];
    expect(planTasks(shuffled, schedule).map((t) => t.id)).toEqual(["a", "b", "c", "d"]);
  });
  it("leaves tasks unscheduled when schedule hours run out", () => {
    const short = planTasks(tasks, new Map([[1, 50]]));
    expect(short.map((t) => t.planWeek)).toEqual([1, 1, null, null]);
  });
  it("handles a plan with no hours", () => {
    expect(planTasks([{ id: "x", order: 1, planHours: 0, completedWeek: null }], schedule)[0]?.planValue).toBe(0);
  });
});

describe("buildSchedule", () => {
  const s = buildSchedule({
    tasks,
    schedule,
    actualHours: new Map([
      [1, 20],
      [2, 30],
      [3, 25],
      [4, 99], // after the current week: ignored
    ]),
    weeks: [1, 2, 3, 4, 5, 6, 7, 8],
    currentWeek: 3,
  });
  it("totals task and schedule hours and their difference", () => {
    expect(s.totalTaskPlanHours).toBe(100);
    expect(s.totalSchedulePlanHours).toBe(100);
    expect(s.difference).toBe(0);
    expect(s.unscheduledTaskIds).toEqual([]);
  });
  it("puts PV in the planned week and EV in the completion week", () => {
    const w = s.weeks;
    expect(w.map((x) => x.plannedValue).slice(0, 4)).toEqual([0.1, 0.2, 0.3, 0.4]);
    expect(w.map((x) => x.earnedValue).slice(0, 4)).toEqual([0, 0.1, 0.2, 0]);
    expect(w[2]?.cumPlannedValue).toBe(0.6);
    expect(w[2]?.cumEarnedValue).toBe(0.3);
  });
  it("accumulates planned and actual hours, counting actuals only up to the current week", () => {
    expect(s.weeks[2]?.cumPlanHours).toBe(75);
    expect(s.weeks[2]?.cumActualHours).toBe(75);
    expect(s.weeks[3]?.actualHours).toBe(0);
  });
  it("predicts future EV at the average weekly EV so far, capped at 100%", () => {
    // 30% earned over 3 weeks = 10% per week
    expect(s.weeks[2]?.cumPredictedEarnedValue).toBeNull();
    expect(s.weeks[3]?.cumPredictedEarnedValue).toBe(0.4);
    expect(s.weeks[7]?.cumPredictedEarnedValue).toBe(0.8);
    expect(s.weeks[3]?.cumPredictedHours).toBe(100);
    expect(s.predictedCompletionWeek).toBeNull();
  });
  it("finds the predicted completion week", () => {
    const long = buildSchedule({ tasks, schedule, actualHours: new Map(), weeks: Array.from({ length: 15 }, (_, i) => i + 1), currentWeek: 3 });
    expect(long.predictedCompletionWeek).toBe(10);
    expect(long.weeks.at(-1)?.cumPredictedEarnedValue).toBe(1);
  });
  it("predicts nothing in break weeks and leaves them out of the average", () => {
    const b = buildSchedule({ tasks, schedule, actualHours: new Map(), weeks: [1, 2, 3, 4, 5, 6], currentWeek: 3, breakWeeks: [2, 5] });
    // weeks 1 and 3 count: 30% / 2 = 15% per working week
    expect(b.weeks[3]?.cumPredictedEarnedValue).toBe(0.45);
    expect(b.weeks[4]?.predictedEarnedValue).toBe(0);
    expect(b.weeks[4]?.predictedHours).toBe(0);
    expect(b.weeks[5]?.cumPredictedEarnedValue).toBe(0.6);
  });
  it("warns when tasks need more hours than are scheduled", () => {
    const r = buildSchedule({ tasks, schedule: new Map([[1, 60]]), actualHours: new Map(), weeks: [1, 2], currentWeek: 1 });
    expect(r.difference).toBe(40);
    expect(r.unscheduledTaskIds).toEqual(["d"]); // c fits exactly: cumulative 60 of 60
  });
});
