import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN_YIELDS, DEV_PHASES, TIME_PHASES, computeSump, computeSumq, div, plannedDefects, type QualityInput } from "./quality";
import { sizeTotals, ZERO_SIZE } from "./sizes";

const size = (n: number, reqPages = 0, hldPages = 0) => ({ reqPages, hldPages, dldLines: 0, textPages: 0, loc: sizeTotals({ ...ZERO_SIZE, added: n }) });

const input: QualityInput = {
  size: { plan: size(2000, 20, 10), actual: size(1000, 25, 8) },
  planHours: { REQ: 20, REQINSP: 5, HLD: 10, HLDINSP: 5, DLD: 10, DLDR: 5, CODE: 20, CR: 10, COMPILE: 2, UT: 10, MGMT: 3 },
  actualHours: { REQ: 16, REQINSP: 4, HLD: 10, HLDINSP: 2, DLD: 8, DLDR: 2, CODE: 25, CR: 5, COMPILE: 1, UT: 12, MGMT: 5 },
  actualInjected: { REQ: 4, HLD: 2, CODE: 10, COMPILE: 1 },
  actualRemoved: { REQINSP: 3, HLDINSP: 2, CR: 6, COMPILE: 2, UT: 3, AT: 1 },
  planInjectionRate: { REQ: 0.25, HLD: 0.25, DLD: 0.75, CODE: 2 },
  planYield: { REQINSP: 0.7, HLDINSP: 0.7, DLDR: 0.7, CR: 0.7, COMPILE: 0.5, UT: 0.9, AT: 0.65 },
  locParts: [{ removedIn: ["CR", "UT"] }, { removedIn: ["COMPILE"] }, { removedIn: [] }, { removedIn: ["CR"] }],
};

describe("phase lists", () => {
  it("SUMP defect rows run Planning to System Test; time rows exclude AT and PL", () => {
    expect(DEV_PHASES).toHaveLength(18);
    expect(DEV_PHASES[0]).toBe("PLAN");
    expect(DEV_PHASES.at(-1)).toBe("ST");
    expect(TIME_PHASES).toHaveLength(22);
    expect(TIME_PHASES).not.toContain("AT");
  });
  it("defaults match the workbook guidelines", () => {
    expect(DEFAULT_PLAN_YIELDS.UT).toBe(0.9);
    expect(DEFAULT_PLAN_YIELDS.COMPILE).toBe(0.5);
  });
  it("div returns null on a zero denominator", () => {
    expect(div(1, 0)).toBeNull();
    expect(div(1, 4)).toBe(0.25);
  });
});

describe("plannedDefects", () => {
  it("injects rate × hours and removes yield × defects present", () => {
    const p = plannedDefects({ CODE: 10, CR: 2, UT: 5 }, { CODE: 2 }, { CR: 0.5, UT: 0.8, AT: 0.5 });
    expect(p.injected.CODE).toBe(20);
    expect(p.removed.CR).toBe(10); // 50% of 20
    expect(p.removed.UT).toBe(8); // 80% of the 10 that escaped review
    expect(p.removed.AT).toBe(1); // 50% of the 2 left
    expect(p.removed.PL).toBe(1); // the rest
  });
  it("keeps yields within 0..1", () => {
    expect(plannedDefects({ CODE: 1 }, { CODE: 1 }, { CR: 2 }).removed.CR).toBe(1);
  });
});

describe("SUMP", () => {
  const s = computeSump(input);
  it("totals time in phase and gives actual %", () => {
    expect(s.timeTotal).toEqual({ plan: 100, actual: 90 });
    expect(s.time.find((r) => r.phase === "CODE")?.actualPct).toBeCloseTo(25 / 90);
  });
  it("totals actual defects injected and removed in development", () => {
    expect(s.injectedTotal.actual).toBe(17);
    expect(s.removedTotal.actual).toBe(16);
    expect(s.acceptanceTest.actual).toBe(1);
  });
  it("planned injected defects = rate × planned hours", () => {
    expect(s.injected.find((r) => r.phase === "CODE")?.plan).toBe(40);
    expect(s.injectedTotal.plan).toBe(5 + 2.5 + 7.5 + 40);
  });
  it("LOC/hour = N&C / total hours; CPI = plan / actual hours", () => {
    expect(s.summary.locPerHour.plan).toBe(20);
    expect(s.summary.locPerHour.actual).toBeCloseTo(1000 / 90);
    expect(s.summary.cpi.actual).toBeCloseTo(100 / 90);
  });
  it("%Reuse is null when nothing is reused relative to an empty total", () => {
    expect(s.summary.reusePct.actual).toBe(0);
    expect(s.summary.newReusePct.actual).toBe(0);
  });
});

describe("SUMQ", () => {
  const q = computeSumq(input);
  const find = <T extends { label: string }>(rows: T[], label: string) => rows.find((r) => r.label === label)!;
  it("percent defect free over LOC parts", () => {
    expect(q.percentDefectFree.find((r) => r.phase === "COMPILE")?.actual).toBe(0.75);
    expect(q.percentDefectFree.find((r) => r.phase === "UT")?.actual).toBe(0.75);
    expect(q.percentDefectFree.find((r) => r.phase === "IT")?.actual).toBe(1);
  });
  it("defects per page for inspections", () => {
    expect(find(q.defectsPerPage, "REQ Inspection").actual).toBe(3 / 25);
    expect(find(q.defectsPerPage, "HLD Inspection").actual).toBe(0.25);
  });
  it("defects per KLOC = removed / N&C × 1000", () => {
    expect(find(q.defectsPerKloc, "CR").actual).toBe(6);
    expect(find(q.defectsPerKloc, "Total Development").actual).toBe(16);
    expect(find(q.defectsPerKloc, "Total").actual).toBe(17);
  });
  it("defect ratios", () => {
    expect(find(q.defectRatios, "Code Review / Compile").actual).toBe(3);
    expect(find(q.defectRatios, "DLD Review / Unit Test").actual).toBe(0);
  });
  it("development time ratios", () => {
    expect(find(q.timeRatios, "REQ Inspection / Requirements").actual).toBe(0.25);
    expect(find(q.timeRatios, "Code Review / Code").actual).toBe(0.2);
  });
  it("review rates", () => {
    expect(find(q.reviewRates, "Code Review (LOC/h)").actual).toBe(200);
    expect(find(q.reviewRates, "DLD Review (lines/h)").actual).toBe(500); // no DLD lines: uses N&C, as the workbook does
    expect(find(q.reviewRates, "Code Inspection (LOC/h)").actual).toBeNull();
  });
  it("A/FR = (DLDR + DLDINSP + CR + CODEINSP) / (COMPILE + UT) time", () => {
    expect(q.afr.actual).toBeCloseTo((2 + 5) / (1 + 12));
    expect(q.afr.plan).toBeCloseTo(15 / 12);
  });
  it("actual phase yield = removed / (injected so far − removed before)", () => {
    const y = (p: string) => q.phaseYields.find((r) => r.phase === p)!.actual;
    expect(y("REQINSP")).toBe(0.75); // 3 of 4
    expect(y("HLDINSP")).toBe(2 / 3); // 2 of (4 + 2 − 3)
    expect(y("CR")).toBe(6 / 11); // 6 of (16 − 5)
    expect(y("AT")).toBe(1); // 1 of (17 − 16)
    expect(q.phaseYields.find((r) => r.phase === "UT")?.plan).toBe(0.9);
  });
  it("process yield = removed before the phase / injected before it", () => {
    expect(find(q.processYields, "% before COMPILE").actual).toBe(11 / 16);
    expect(find(q.processYields, "% before AT").actual).toBe(16 / 17);
  });
  it("injection and removal rates per hour", () => {
    expect(q.injectionRates.find((r) => r.phase === "CODE")?.actual).toBe(0.4);
    expect(q.injectionRates.find((r) => r.phase === "CODE")?.plan).toBe(2);
    expect(q.removalRates.find((r) => r.phase === "CR")?.actual).toBe(1.2);
  });
});
