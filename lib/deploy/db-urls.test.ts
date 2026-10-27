import { describe, expect, it } from "vitest";
import { directDatabaseUrl, hasDirectUrl } from "./db-urls";

describe("directDatabaseUrl", () => {
  it("prefers DIRECT_URL, then Neon's DATABASE_URL_UNPOOLED, then DATABASE_URL", () => {
    expect(directDatabaseUrl({ DIRECT_URL: "d", DATABASE_URL_UNPOOLED: "u", DATABASE_URL: "p" })).toBe("d");
    expect(directDatabaseUrl({ DATABASE_URL_UNPOOLED: "u", DATABASE_URL: "p" })).toBe("u");
    expect(directDatabaseUrl({ DIRECT_URL: " ", DATABASE_URL: "p" })).toBe("p");
    expect(directDatabaseUrl({})).toBeUndefined();
  });
  it("knows whether a direct connection is configured", () => {
    expect(hasDirectUrl({ DATABASE_URL_UNPOOLED: "u" })).toBe(true);
    expect(hasDirectUrl({ DATABASE_URL: "p" })).toBe(false);
  });
});
