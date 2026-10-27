import { describe, expect, it } from "vitest";
import { registerSchema, passwordSchema, emailSchema } from "./auth";

describe("auth schemas", () => {
  it("normalises e-mail", () => {
    expect(emailSchema.parse("  Ali@Siswa.Unimas.My ")).toBe("ali@siswa.unimas.my");
  });
  it("requires letters and a number in passwords", () => {
    expect(passwordSchema.safeParse("abcdefghij").success).toBe(false);
    expect(passwordSchema.safeParse("1234567890").success).toBe(false);
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("flutter2026").success).toBe(true);
  });
  it("checks password confirmation", () => {
    const r = registerSchema.safeParse({ name: "Ali", email: "a@unimas.my", password: "flutter2026", confirmPassword: "flutter2027" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
