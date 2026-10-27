import { describe, expect, it } from "vitest";
import { PHASES, phaseName } from "./phases";

describe("TSPi phases", () => {
  it("has the workbook's 24 phases in process order", () => {
    expect(PHASES).toHaveLength(24);
    expect(PHASES[0]?.code).toBe("MGMT");
    expect(PHASES.at(-1)?.code).toBe("PL");
  });
  it("follows the workbook flags for time and defect tracking", () => {
    expect(PHASES.filter((p) => !p.logTime).map((p) => p.code)).toEqual(["AT", "PL"]);
    expect(PHASES.filter((p) => !p.defectsInjected).map((p) => p.code)).toEqual(["MGMT", "STRAT", "DOC", "PM"]);
  });
  it("names phases", () => {
    expect(phaseName("IT")).toBe("Build and Integration Test");
  });
});
