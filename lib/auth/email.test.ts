import { describe, expect, it } from "vitest";
import { isAllowedEmail, normaliseEmail } from "./email";

const domains = ["siswa.unimas.my", "unimas.my"];

describe("isAllowedEmail", () => {
  it("accepts listed domains, case-insensitively", () => {
    expect(isAllowedEmail("12345@siswa.unimas.my", domains)).toBe(true);
    expect(isAllowedEmail("Lecturer@UNIMAS.MY", domains)).toBe(true);
  });
  it("rejects other domains and look-alikes", () => {
    expect(isAllowedEmail("a@gmail.com", domains)).toBe(false);
    expect(isAllowedEmail("a@evilunimas.my", domains)).toBe(false);
    expect(isAllowedEmail("a@unimas.my.evil.com", domains)).toBe(false);
    expect(isAllowedEmail("a@sub.siswa.unimas.my", domains)).toBe(false);
  });
  it("rejects malformed addresses", () => {
    expect(isAllowedEmail("unimas.my", domains)).toBe(false);
    expect(isAllowedEmail("@unimas.my", domains)).toBe(false);
    expect(isAllowedEmail("a@", domains)).toBe(false);
  });
  it("uses the last @ for the domain", () => {
    expect(isAllowedEmail("a@gmail.com@unimas.my", domains)).toBe(true);
    expect(normaliseEmail("  A@Unimas.My ")).toBe("a@unimas.my");
  });
});
