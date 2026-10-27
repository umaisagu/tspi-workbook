import { describe, expect, it } from "vitest";
import { backupFileName, isPooledUrl, redactUrl } from "./backup";

describe("backup helpers", () => {
  it("detects Neon pooled connection strings", () => {
    expect(isPooledUrl("postgresql://u:p@ep-cool-name-123-pooler.ap-southeast-1.aws.neon.tech/neondb")).toBe(true);
    expect(isPooledUrl("postgresql://u:p@ep-cool-name-123.ap-southeast-1.aws.neon.tech/neondb")).toBe(false);
  });
  it("names the file after the host and UTC time", () => {
    expect(backupFileName("postgresql://u:p@ep-cool-name-123.aws.neon.tech/neondb", new Date("2026-10-27T18:05:09Z"))).toBe("tspi-ep-cool-name-123-20261027-1805.dump");
    expect(backupFileName("nonsense", new Date("2026-01-02T03:04:00Z"))).toBe("tspi-db-20260102-0304.dump");
  });
  it("hides the password", () => {
    expect(redactUrl("postgresql://tspi:secret@localhost:5432/x")).toBe("postgresql://tspi:***@localhost:5432/x");
  });
});
