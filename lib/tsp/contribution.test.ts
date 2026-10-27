import { describe, expect, it } from "vitest";
import { contributions } from "./contribution";

const c = contributions({
  members: [
    { id: "a", name: "Aina" },
    { id: "b", name: "Ben" },
    { id: "c", name: "Chong" },
    { id: "d", name: "Dayang" },
  ],
  hours: [
    { memberId: "a", week: 3, hours: 5 },
    { memberId: "a", week: 6, hours: 4 },
    { memberId: "b", week: 5, hours: 6 },
    { memberId: "c", week: 2, hours: 5 },
  ],
  tasks: [
    { assigneeId: "a", completed: true, planValue: 0.1 },
    { assigneeId: "a", completed: false, planValue: 0.2 },
    { assigneeId: "b", completed: true, planValue: 0.3 },
    { assigneeId: null, completed: true, planValue: 0.05 },
  ],
  defects: [{ memberId: "a" }, { memberId: "a" }, { memberId: "b" }],
  aiEntries: [
    { memberId: "a", reviewerId: "b", approved: true },
    { memberId: "b", reviewerId: "a", approved: false },
    { memberId: "c", reviewerId: "b", approved: true },
  ],
  tests: [{ authorId: "b" }, { authorId: "b" }],
  currentWeek: 6,
});
const get = (id: string) => c.members.find((m) => m.memberId === id)!;

describe("contributions", () => {
  it("sums each measure per member", () => {
    expect(get("a").values).toEqual({ hours: 9, recentHours: 4, tasksCompleted: 1, earnedValue: 10, defects: 2, aiEntries: 1, aiReviews: 0, tests: 0 });
    expect(get("b").values).toMatchObject({ hours: 6, recentHours: 6, earnedValue: 30, aiReviews: 2, tests: 2 });
  });
  it("counts only approved reviews of other members' entries", () => {
    expect(get("a").values.aiReviews).toBe(0);
  });
  it("gives shares of the team total and the team average", () => {
    expect(get("a").shares.hours).toBe(9 / 20);
    expect(get("d").shares.hours).toBe(0);
    expect(c.totals.hours).toBe(20);
    expect(c.average.hours).toBe(5);
    expect(c.fairShare).toBe(0.25);
  });
  it("share is null when nobody has any", () => {
    const empty = contributions({ members: [{ id: "a", name: "A" }], hours: [], tasks: [], defects: [], aiEntries: [], tests: [], currentWeek: 3 });
    expect(empty.members[0]?.shares.hours).toBeNull();
  });
});
