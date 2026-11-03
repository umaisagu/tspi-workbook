import { describe, expect, it } from "vitest";
import { formatAiCode, nextAiCode, isApprovedVerdict, keepRate, parseAiCode, verdictLabel } from "./ai-log";

describe("LOGAI codes", () => {
  it("formats as AI-001", () => {
    expect(formatAiCode(1)).toBe("AI-001");
    expect(formatAiCode(1234)).toBe("AI-1234");
  });
  it("parses codes", () => {
    expect(parseAiCode("AI-010")).toBe(10);
    expect(parseAiCode("AI-1")).toBeNull();
    expect(parseAiCode("X-001")).toBeNull();
  });
  it("continues after the highest existing code", () => {
    expect(nextAiCode([])).toBe("AI-001");
    expect(nextAiCode(["AI-001", "AI-003", "junk"])).toBe("AI-004");
  });
});

describe("v3.0 LOGAI review", () => {
  it("counts Approved and Approved with changes as approved", () => {
    expect(isApprovedVerdict("APPROVED_WITH_CHANGES")).toBe(true);
    expect(isApprovedVerdict("CHANGES_REQUESTED")).toBe(false);
    expect(verdictLabel("REJECTED")).toBe("Rejected");
  });
  it("computes the keep rate", () => {
    expect(keepRate(60, 45)).toBe(0.75);
    expect(keepRate(0, 0)).toBeNull();
    expect(keepRate(null, 5)).toBeNull();
  });
});
