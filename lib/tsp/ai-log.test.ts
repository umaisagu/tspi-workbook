import { describe, expect, it } from "vitest";
import { formatAiCode, nextAiCode, parseAiCode } from "./ai-log";

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
