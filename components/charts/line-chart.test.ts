import { describe, expect, it } from "vitest";
import { niceTicks } from "./line-chart";

describe("niceTicks", () => {
  it("uses round 1-2-5 steps", () => {
    expect(niceTicks(221)).toEqual([0, 50, 100, 150, 200, 250]);
    expect(niceTicks(9)).toEqual([0, 2, 4, 6, 8, 10]);
    expect(niceTicks(0.83)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });
  it("handles empty data", () => {
    expect(niceTicks(0)).toEqual([0, 0.25, 0.5, 0.75, 1]);
  });
});
