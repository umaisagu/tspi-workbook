import { describe, expect, it } from "vitest";
import { computeMySump, computeMySumq, type PersonalInput } from "./personal";

const input: PersonalInput = {
  planHours: { CODE: 10, CR: 5, UT: 5 },
  actualHours: { DLD: 4, DLDR: 2, CODE: 6, AIGEN: 2, CR: 2, BUILD: 1, UT: 1, MGMT: 2 },
  injected: { CODE: 5, AIGEN: 3 },
  removed: { CR: 4, DLDR: 1, UT: 2, BUILD: 1 },
  defects: 8,
  size: { planLoc: 500, actLoc: 400, planPages: 4, actPages: 5, planScreens: 2, actScreens: null },
  tests: { total: 10, pass: 9 },
  ai: { linesGenerated: 200, linesKept: 150, noReviewer: 1, selfReviewed: 0 },
};

describe("MYSUMP", () => {
  const s = computeMySump(input);
  it("plan hours from own tasks, actual from own LOGT", () => {
    expect(s.timeTotal).toEqual({ plan: 20, actual: 20 });
    expect(s.time.find((r) => r.phase === "CODE")).toMatchObject({ plan: 10, actual: 6, actualPct: 0.3 });
  });
  it("defects injected / removed are actual only", () => {
    expect(s.injectedTotal).toBe(8);
    expect(s.removedTotal).toBe(8);
    expect(s.injected.find((r) => r.phase === "AIGEN")).toMatchObject({ plan: null, actual: 3 });
  });
  it("size contribution: typed sizes, test cases from LOGTEST", () => {
    expect(s.size.map((r) => [r.plan, r.actual])).toEqual([
      [500, 400],
      [4, 5],
      [2, null],
      [null, 10],
    ]);
  });
});

describe("MYSUMQ", () => {
  const q = computeMySumq(input);
  const row = (label: string) => q.find((r) => r.label === label)!;
  it("review ratios with LOW verdicts below the guideline", () => {
    expect(row("Design review / design time").actual).toBe(0.5);
    expect(row("Design review / design time").verdict).toBe("OK");
    expect(row("Code review / code time").actual).toBe(0.25); // CR ÷ (CODE + AIGEN)
    expect(row("Code review / code time").verdict).toBe("LOW");
  });
  it("code review rate: my LOC ÷ CR hours; ACTION above 200", () => {
    expect(row("My code review rate (LOC/hr)").actual).toBe(200);
    expect(row("My code review rate (LOC/hr)").verdict).toBe("OK");
    expect(computeMySumq({ ...input, size: { ...input.size, actLoc: 1000 } }).find((r) => r.label === "My code review rate (LOC/hr)")!.verdict).toBe("ACTION");
  });
  it("A/FR = (DLDR + CR) ÷ (BUILD + UT + WT)", () => {
    expect(row("A/FR (appraisal / failure)").actual).toBe(2);
  });
  it("% found before test counts review and inspection removals", () => {
    expect(row("% of my defects found before test").actual).toBeCloseTo(5 / 8);
    expect(row("% of my defects found before test").verdict).toBe("LOW");
    expect(row("Defects / KLOC in my code").actual).toBe(20);
  });
  it("tests and AI", () => {
    expect(row("My test pass rate").actual).toBe(0.9);
    expect(row("My AI keep rate").actual).toBe(0.75);
    expect(row("My AI entries with no reviewer").verdict).toBe("ACTION");
    expect(row("My AI entries I reviewed myself").verdict).toBe("OK");
  });
  it("no denominators give null, not 0", () => {
    const empty = computeMySumq({ ...input, actualHours: {}, defects: 0, size: { ...input.size, actLoc: null }, tests: { total: 0, pass: 0 } });
    expect(empty.find((r) => r.label === "Design review / design time")!.actual).toBeNull();
    expect(empty.find((r) => r.label === "% of my defects found before test")!.actual).toBeNull();
    expect(empty.find((r) => r.label === "Defects / KLOC in my code")!.actual).toBeNull();
    expect(empty.find((r) => r.label === "My test pass rate")!.verdict).toBeNull();
  });
});
