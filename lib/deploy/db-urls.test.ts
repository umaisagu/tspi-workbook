import { describe, expect, it } from "vitest";
import { connectionStringProblem, directDatabaseUrl, hasDirectUrl } from "./db-urls";

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

describe("connectionStringProblem", () => {
  const url = "postgresql://u:p@ep-x-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
  it("accepts a bare connection string (or nothing)", () => {
    expect(connectionStringProblem("DATABASE_URL", url)).toBeNull();
    expect(connectionStringProblem("DATABASE_URL", `  ${url}\n`)).toBeNull();
    expect(connectionStringProblem("DATABASE_URL", "postgres://u:p@localhost:5432/db")).toBeNull();
    expect(connectionStringProblem("DIRECT_URL", undefined)).toBeNull();
  });
  it("names the usual paste mistakes", () => {
    expect(connectionStringProblem("DATABASE_URL", `"${url}"`)).toContain("remove the quotes");
    expect(connectionStringProblem("DATABASE_URL", `DATABASE_URL=${url}`)).toContain('remove the "DATABASE_URL=" prefix');
    expect(connectionStringProblem("DATABASE_URL", `psql '${url}'`)).toContain("not the psql command");
    expect(connectionStringProblem("DATABASE_URL", `# Recommended\n${url}`)).toContain("must be just the connection string");
  });
});
