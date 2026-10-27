import { describe, expect, it } from "vitest";
import { COMMITMENT_DAYS, COMMITMENT_SLOTS, SKILL_AREAS, freeSlots, slotLabel } from "./student-info";

describe("FORM-SI structure", () => {
  it("has the ten skill areas of section B", () => {
    expect(SKILL_AREAS).toHaveLength(10);
  });
  it("has a 7 x 7 commitment grid from 8:00 to 22:00", () => {
    expect(COMMITMENT_SLOTS).toHaveLength(7);
    expect(COMMITMENT_DAYS).toHaveLength(7);
    expect(slotLabel("08-10")).toBe("08:00 – 10:00");
  });
  it("lists free slots, never the fixed Wednesday lab", () => {
    const all = freeSlots({});
    expect(all).toHaveLength(48);
    expect(all).not.toContain("Wed 16-18");
    expect(freeSlots({ "08-10": { Mon: "C" } })).not.toContain("Mon 08-10");
  });
});
