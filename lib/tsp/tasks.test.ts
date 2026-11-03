import { describe, expect, it } from "vitest";
import { nextTaskCode, taskStatusErrors, taskStatusLabel } from "./tasks";

describe("Task IDs", () => {
  it("continue after the highest T-number", () => {
    expect(nextTaskCode([])).toBe("T01");
    expect(nextTaskCode(["T01", "T09", null, "LOGIN-1"])).toBe("T10");
    expect(nextTaskCode(["t120"])).toBe("T121");
  });
});

describe("task status", () => {
  it("Complete needs a completion date and only Complete has one", () => {
    expect(taskStatusErrors("COMPLETE", "2026-10-20")).toEqual({});
    expect(taskStatusErrors("PLANNED", null)).toEqual({});
    expect(taskStatusErrors("COMPLETE", null)).toEqual({ completedOn: "Enter the date the task was completed" });
    expect(taskStatusErrors("CANCELLED", "2026-10-20").status).toBeDefined();
    expect(taskStatusLabel("CARRIED_OVER")).toBe("Carried over");
  });
});
