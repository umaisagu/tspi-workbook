import { describe, expect, it } from "vitest";
import { WORKBOOK } from "@/lib/reference/workbook";
import { PHASES, phaseName } from "./phases";

describe("TSPi phases (Workbook v3.0)", () => {
  it("has the 27 v3.0 phases in process order", () => {
    expect(PHASES).toHaveLength(27);
    expect(PHASES[0]?.code).toBe("MGMT");
    expect(PHASES.at(-1)?.code).toBe("PL");
  });
  it("matches the PHASES sheet: codes, names and flags", () => {
    const yn = (b: boolean) => (b ? "Y" : "N");
    expect(PHASES.map((p) => [p.code, p.name, yn(p.logTime), yn(p.defectsInjected), yn(p.defectsRemoved), yn(p.development)])).toEqual(
      WORKBOOK.phases.map((p) => [p.code, p.name, p.logTime, p.injected, p.removed, p.development]),
    );
  });
  it("logs time everywhere except Product Life; UAT does not count as development", () => {
    expect(PHASES.filter((p) => !p.logTime).map((p) => p.code)).toEqual(["PL"]);
    expect(PHASES.find((p) => p.code === "UAT")?.development).toBe(false);
    expect(phaseName("AIGEN")).toBe("Code - AI-assisted generation (Vibe)");
  });
});
