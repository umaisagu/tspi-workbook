import { describe, expect, it } from "vitest";
import { checkTarget, deployTarget, seedAllowed } from "./target";

describe("deploy target", () => {
  it("maps VERCEL_ENV", () => {
    expect(deployTarget("production")).toBe("production");
    expect(deployTarget("preview")).toBe("preview");
    expect(deployTarget(undefined)).toBe("development");
    expect(deployTarget("development")).toBe("development");
  });
  it("marks an unmarked database with the build's environment", () => {
    expect(checkTarget("preview", null)).toEqual({ ok: true, mark: "preview" });
  });
  it("accepts a matching database", () => {
    expect(checkTarget("production", "production")).toEqual({ ok: true, mark: null });
  });
  it("refuses a preview build on the production database and the reverse", () => {
    const a = checkTarget("preview", "production");
    expect(a.ok).toBe(false);
    if (!a.ok) expect(a.message).toContain('marked "production", but this is a preview build');
    expect(checkTarget("production", "preview").ok).toBe(false);
    expect(checkTarget("development", "production").ok).toBe(false);
  });
  it("never seeds production", () => {
    expect(seedAllowed("production")).toBe(false);
    expect(seedAllowed("preview")).toBe(true);
    expect(seedAllowed(null)).toBe(true);
  });
});
