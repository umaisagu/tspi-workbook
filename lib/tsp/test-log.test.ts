import { describe, expect, it } from "vitest";
import { nextTestCode, testSummary } from "./test-log";

describe("nextTestCode", () => {
  it("numbers TC-001 upwards and never reuses codes", () => {
    expect(nextTestCode([])).toBe("TC-001");
    expect(nextTestCode(["TC-001", "TC-007", "login-1"])).toBe("TC-008");
  });
});

describe("testSummary", () => {
  it("counts by status and type; pass rate over executed tests", () => {
    const s = testSummary([
      { status: "PASS", type: "UNIT" },
      { status: "PASS", type: "WIDGET" },
      { status: "FAIL", type: "UNIT" },
      { status: "NOT_RUN", type: "INTEGRATION" },
    ]);
    expect(s).toMatchObject({ total: 4, pass: 2, fail: 1, notRun: 1, unit: 2, widget: 1, integration: 1 });
    expect(s.passRate).toBeCloseTo(2 / 3);
    expect(testSummary([]).passRate).toBeNull();
  });
});
