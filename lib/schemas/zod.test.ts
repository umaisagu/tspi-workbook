import { describe, expect, it } from "vitest";
import { z } from "./zod";

describe("zod setup", () => {
  it("runs jitless, so no eval probe trips the CSP", () => {
    expect(z.config().jitless).toBe(true);
    expect(z.object({ a: z.string() }).parse({ a: "x" })).toEqual({ a: "x" });
  });
});
