import type { ZodError } from "@/lib/schemas/zod";

/** Zod issues → { "field.path": ["message", ...] } for showing next to inputs. */
export function fieldErrorsFrom(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
