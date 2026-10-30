import { describe, expect, it } from "vitest";
import { DEFECT_TYPES, defectPhaseErrors, defectTypeLabel, isDefectType, nextDefectNumber } from "./defects";

describe("defect types", () => {
  it("are the ten TSP types plus the five TMA3084 types (110-150)", () => {
    expect(DEFECT_TYPES.map((t) => t.code)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]);
    expect(defectTypeLabel(150)).toBe("150 AI-Generated");
    expect(isDefectType(80)).toBe(true);
    expect(isDefectType(85)).toBe(false);
    expect(defectTypeLabel(50)).toBe("50 Interface");
  });
});

describe("defect numbering", () => {
  it("continues after the highest number, never reusing", () => {
    expect(nextDefectNumber([])).toBe(1);
    expect(nextDefectNumber([1, 2, 5])).toBe(6);
  });
});

describe("defect phases", () => {
  it("accepts removal in the same or a later phase", () => {
    expect(defectPhaseErrors("CODE", "CR")).toEqual({});
    expect(defectPhaseErrors("CODE", "CODE")).toEqual({});
    expect(defectPhaseErrors("REQ", "AT")).toEqual({});
  });
  it("rejects removal before injection", () => {
    expect(defectPhaseErrors("UT", "CODE").phaseRemoved).toBeDefined();
  });
  it("rejects phases that do not track defects", () => {
    expect(defectPhaseErrors("MGMT", "CR").phaseInjected).toBeDefined();
    expect(defectPhaseErrors("CODE", "DOC").phaseRemoved).toBeDefined();
  });
});
