import { describe, expect, it } from "vitest";
import { RATE_LIMITS, rateLimitKey, retryAfterSeconds, windowStart } from "./rate-limit-window";

describe("fixed-window rate limiting", () => {
  const w = 15 * 60 * 1000;
  it("aligns windows to the window size", () => {
    const t = new Date("2026-10-27T10:07:30Z");
    expect(windowStart(t, w).toISOString()).toBe("2026-10-27T10:00:00.000Z");
    expect(windowStart(new Date("2026-10-27T10:15:00Z"), w).toISOString()).toBe("2026-10-27T10:15:00.000Z");
  });
  it("reports seconds remaining in the window", () => {
    expect(retryAfterSeconds(new Date("2026-10-27T10:14:00Z"), w)).toBe(60);
  });
  it("builds case-insensitive keys", () => {
    expect(rateLimitKey(RATE_LIMITS.loginEmail, " A@Unimas.my ")).toBe("login:email:a@unimas.my");
  });
});
