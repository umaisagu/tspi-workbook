import { describe, expect, it } from "vitest";
import { buildCsp, newNonce } from "./csp";

describe("buildCsp", () => {
  it("allows only nonce'd scripts in production", () => {
    const csp = buildCsp({ nonce: "abc", dev: false, https: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });
  it("adds unsafe-eval only in development and skips the https upgrade on http", () => {
    const csp = buildCsp({ nonce: "abc", dev: true, https: false });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("newNonce", () => {
  it("is random and base64", () => {
    const a = newNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(newNonce()).not.toBe(a);
  });
});
