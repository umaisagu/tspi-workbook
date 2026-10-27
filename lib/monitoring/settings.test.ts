import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS, readThresholds, thresholdsSchema } from "./settings";

describe("monitoring thresholds", () => {
  it("defaults follow the brief (50% of fair share over 3 weeks, 2 inactive weeks)", () => {
    expect(DEFAULT_THRESHOLDS.lowShare).toEqual({ fraction: 0.5, windowWeeks: 3, minTeamHours: 10 });
    expect(DEFAULT_THRESHOLDS.inactive.weeks).toBe(2);
    expect(DEFAULT_THRESHOLDS.backfill.minEntries).toBe(5);
  });
  it("fills missing keys from defaults", () => {
    const t = readThresholds({ lowShare: { fraction: 0.4 } });
    expect(t.lowShare).toEqual({ fraction: 0.4, windowWeeks: 3, minTeamHours: 10 });
    expect(t.peerMismatch.selfAbovePeers).toBe(10);
  });
  it("falls back to defaults for invalid stored values", () => {
    expect(readThresholds({ inactive: { weeks: -3 } })).toEqual(DEFAULT_THRESHOLDS);
    expect(readThresholds(null)).toEqual(DEFAULT_THRESHOLDS);
  });
  it("rejects invalid input from the settings form", () => {
    expect(thresholdsSchema.safeParse({ lowShare: { fraction: 2 } }).success).toBe(false);
  });
});
