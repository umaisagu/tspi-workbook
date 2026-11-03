import { describe, expect, it } from "vitest";
import { DEFAULT_PLAN_YIELDS, DEV_PHASES, TIME_PHASES, computeSump, computeSumq, div, plannedDefects, verdictFor, type QualityInput } from "./quality";
import { sizeTotals, ZERO_SIZE, type ProgramSize } from "./sizes";

const size = (n: number, reqPages = 0, hldPages = 0, screens = 0): ProgramSize => ({
  reqPages,
  hldPages,
  dldLines: 0,
  textPages: 0,
  screens,
  widgets: 0,
  apiEndpoints: 0,
  testCases: 0,
  loc: sizeTotals({ ...ZERO_SIZE, added: n }),
});

const input: QualityInput = {
  size: { plan: size(2000, 20, 10, 8), actual: size(1000, 25, 8, 6) },
  planHours: { REQ: 20, REQINSP: 5, HLD: 10, HLDINSP: 5, DLD: 10, DLDR: 5, CODE: 20, CR: 10, BUILD: 2, UT: 10, MGMT: 3 },
  actualHours: { REQ: 16, REQINSP: 4, HLD: 10, HLDINSP: 2, DLD: 8, DLDR: 2, CODE: 20, AIGEN: 5, CR: 5, BUILD: 1, UT: 12, MGMT: 5 },
  actualInjected: { REQ: 4, HLD: 2, CODE: 10, BUILD: 1 },
  actualRemoved: { REQINSP: 3, HLDINSP: 2, CR: 6, BUILD: 2, UT: 3, UAT: 1 },
  planInjectionRate: { REQ: 0.25, HLD: 0.25, DLD: 0.75, CODE: 2 },
  planYield: { REQINSP: 0.7, HLDINSP: 0.7, DLDR: 0.7, CR: 0.7, BUILD: 0.5, UT: 0.9, UAT: 0.65 },
  ai: { linesKept: 250, defectsFromAi: 2 },
  tests: { total: 20, pass: 19, automated: 15, byType: { UNIT: 12, WIDGET: 6, INTEGRATION: 2 } },
  coverage: 0.55,
  openDefects: { total: 2, critical: 0 },
  locParts: [{ removedIn: ["CR", "UT"] }, { removedIn: ["BUILD"] }, { removedIn: [] }, { removedIn: ["CR"] }],
};

describe("phase lists (v3.0)", () => {
  it("SUMP defect rows run Planning to System Test; time rows are every phase but Product Life", () => {
    expect(DEV_PHASES).toHaveLength(21);
    expect(DEV_PHASES[0]).toBe("PLAN");
    expect(DEV_PHASES.at(-1)).toBe("ST");
    expect(DEV_PHASES).toEqual(expect.arrayContaining(["AIGEN", "BUILD", "WT", "CICD"]));
    expect(DEV_PHASES).not.toContain("UAT");
    expect(TIME_PHASES).toHaveLength(26);
    expect(TIME_PHASES).toContain("UAT");
    expect(TIME_PHASES).not.toContain("PL");
  });
  it("defaults follow the guidelines: reviews and inspections 70%", () => {
    expect(DEFAULT_PLAN_YIELDS.CR).toBe(0.7);
    expect(DEFAULT_PLAN_YIELDS.DLDR).toBe(0.7);
    expect(DEFAULT_PLAN_YIELDS.UT).toBe(0.9);
  });
  it("div returns null on a zero denominator", () => {
    expect(div(1, 0)).toBeNull();
    expect(div(1, 4)).toBe(0.25);
  });
});

describe("plannedDefects", () => {
  it("injects rate × hours and removes yield × defects present; UAT takes its yield, the rest is Product Life", () => {
    const p = plannedDefects({ CODE: 10, CR: 2, UT: 5 }, { CODE: 2 }, { CR: 0.5, UT: 0.8, UAT: 0.5 });
    expect(p.injected.CODE).toBe(20);
    expect(p.removed.CR).toBe(10); // 50% of 20
    expect(p.removed.UT).toBe(8); // 80% of the 10 that escaped review
    expect(p.removed.UAT).toBe(1); // 50% of the 2 left
    expect(p.removed.PL).toBe(1); // the rest
  });
  it("keeps yields within 0..1", () => {
    expect(plannedDefects({ CODE: 1 }, { CODE: 1 }, { CR: 2 }).removed.CR).toBe(1);
  });
  it("typed values replace the computed ones phase by phase, and later phases follow them", () => {
    const p = plannedDefects({ CODE: 10 }, { CODE: 2 }, { CR: 0.5, UT: 1 }, { injected: { CODE: 30 }, removed: { CR: 5 } });
    expect(p.injected.CODE).toBe(30);
    expect(p.removed.CR).toBe(5);
    expect(p.removed.UT).toBe(25); // everything still present
    expect(p.removed.PL).toBe(0);
  });
  it("cannot remove more than is present", () => {
    expect(plannedDefects({ CODE: 1 }, { CODE: 1 }, {}, { removed: { CR: 9 } }).removed.CR).toBe(1);
  });
});

describe("SUMP (v3.0)", () => {
  const s = computeSump(input);
  it("program size: SRS / SDD pages, N&C, total and reused LOC, screens", () => {
    expect(s.size.srsPages).toEqual({ plan: 20, actual: 25 });
    expect(s.size.sddPages).toEqual({ plan: 10, actual: 8 });
    expect(s.size.newAndChanged).toEqual({ plan: 2000, actual: 1000 });
    expect(s.size.screens).toEqual({ plan: 8, actual: 6 });
  });
  it("totals time in phase and gives actual % and plan %", () => {
    expect(s.timeTotal).toEqual({ plan: 100, actual: 90 });
    expect(s.time.find((r) => r.phase === "CODE")?.actualPct).toBeCloseTo(20 / 90);
    expect(s.time.find((r) => r.phase === "CODE")?.planPct).toBeCloseTo(0.2);
  });
  it("totals development defects; UAT and PL are reported after development", () => {
    expect(s.injectedTotal.actual).toBe(17);
    expect(s.removedTotal.actual).toBe(16);
    expect(s.removedLater.uat.actual).toBe(1);
    expect(s.summary.acceptanceDefects).toBe(1);
  });
  it("planned injected defects = rate × planned hours", () => {
    expect(s.injected.find((r) => r.phase === "CODE")?.plan).toBe(40);
    expect(s.injectedTotal.plan).toBe(5 + 2.5 + 7.5 + 40);
  });
  it("summary measures: LOC/hour, CPI, defects/KLOC, hours/defect, AI share", () => {
    expect(s.summary.locPerHour.plan).toBe(20);
    expect(s.summary.locPerHour.actual).toBeCloseTo(1000 / 90);
    expect(s.summary.cpi.actual).toBeCloseTo(100 / 90);
    expect(s.summary.defectsPerKloc.actual).toBe(16);
    expect(s.summary.hoursPerDefect.actual).toBeCloseTo(90 / 16);
    expect(s.summary.aiShare.actual).toBe(0.25);
    expect(s.summary.defectsFromAi).toBe(2);
  });
  it("AI share is null without LOGAI data (e.g. an assembly)", () => {
    expect(computeSump({ ...input, ai: { linesKept: null, defectsFromAi: 0 } }).summary.aiShare.actual).toBeNull();
  });
});

describe("SUMQ (v3.0)", () => {
  const q = computeSumq(input);
  const row = (section: string, label: string) => {
    const r = q.sections.find((s) => s.key === section)?.rows.find((x) => x.label === label);
    if (!r) throw new Error(`${section}: ${label} not found`);
    return r;
  };
  it("verdicts compare the actual with the guideline", () => {
    expect(verdictFor(null, { text: "≥ 2", rule: { op: ">=", value: 2, failed: "LOW" } })).toBeNull();
    expect(verdictFor(2, { text: "≥ 2", rule: { op: ">=", value: 2, failed: "LOW" } })).toBe("OK");
    expect(verdictFor(300, { text: "≤ 200", rule: { op: "<=", value: 200, failed: "TOO FAST" } })).toBe("TOO FAST");
    expect(verdictFor(1, { text: "no target" })).toBeNull();
  });
  it("defect density per page and per KLOC", () => {
    expect(row("density", "Defects / page — requirements inspection").actual).toBeCloseTo(3 / 25);
    expect(row("density", "Defects / KLOC — Code review / PR review").actual).toBe(6);
    expect(row("density", "Defects / KLOC — total development").actual).toBe(16);
    const uat = row("density", "Defects / KLOC — client acceptance test");
    expect(uat.actual).toBe(1);
    expect(uat.verdict).toBe("HIGH");
  });
  it("defect ratios: code review / build ≥ 2", () => {
    const r = row("ratios", "Code review defects / build defects");
    expect(r.actual).toBe(3);
    expect(r.verdict).toBe("OK");
    expect(row("ratios", "Design review defects / unit test defects").actual).toBe(0);
  });
  it("time ratios with v3.0 guidelines", () => {
    expect(row("time", "Detailed design / code").actual).toBeCloseTo(0.4);
    expect(row("time", "Detailed design / code").verdict).toBe("LOW");
    expect(row("time", "Requirements inspection / requirements").verdict).toBe("OK");
    expect(row("time", "AI generation / total coding").verdict).toBeNull();
  });
  it("review rates and A/FR", () => {
    const cr = row("rates", "Code review (LOC/hr)");
    expect(cr.actual).toBe(200);
    expect(cr.verdict).toBe("OK");
    const afr = row("rates", "Appraisal / failure ratio (A/FR)");
    expect(afr.actual).toBeCloseTo((2 + 5) / (1 + 12));
    expect(afr.verdict).toBe("LOW");
  });
  it("process yield: % removed before build", () => {
    // Before BUILD: removed 3 + 2 + 6 = 11 of injected 4 + 2 + 10 = 16.
    expect(row("processYield", "% removed before build & static analysis").actual).toBeCloseTo(11 / 16);
    expect(row("processYield", "% removed before client acceptance test").actual).toBeCloseTo(16 / 17);
  });
  it("test & release quality from LOGTEST, coverage and open defects", () => {
    expect(row("test", "Test pass rate").actual).toBe(0.95);
    expect(row("test", "Test pass rate").verdict).toBe("OK");
    expect(row("test", "Automated share of test cases").actual).toBe(0.75);
    expect(row("test", "Unit tests (share)").actual).toBe(0.6);
    expect(row("test", "Code coverage reported by CI").verdict).toBe("LOW");
    expect(row("test", "Open defects (no fix reference)").actual).toBe(2);
    const critical = computeSumq({ ...input, openDefects: { total: 1, critical: 1 } });
    expect(critical.sections.find((s) => s.key === "test")!.rows.at(-1)!.verdict).toBe("HIGH");
  });
  it("quality profile scores each axis against its target", () => {
    const design = q.profile.find((a) => a.label === "Design / code time")!;
    expect(design.value).toBeCloseTo(0.4);
    expect(design.score).toBeCloseTo(0.4);
    const build = q.profile.find((a) => a.label === "Build defects / KLOC")!;
    expect(build.value).toBe(2);
    expect(build.score).toBe(1); // below the 10/KLOC target
  });
  it("percent defect free over LOC parts", () => {
    expect(q.percentDefectFree.find((r) => r.phase === "BUILD")?.actual).toBe(0.75);
    expect(q.percentDefectFree.find((r) => r.phase === "UT")?.actual).toBe(0.75);
    expect(q.percentDefectFree.find((r) => r.phase === "ST")?.actual).toBe(1);
    expect(computeSumq({ ...input, locParts: [] }).percentDefectFree[0]?.actual).toBeNull();
  });
});
