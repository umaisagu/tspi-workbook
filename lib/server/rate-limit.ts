import "server-only";
import { db } from "@/lib/db";
import { rateLimitKey, retryAfterSeconds, windowStart, type RateLimitRule } from "@/lib/auth/rate-limit-window";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
}

/** Counts one attempt against `rule` for `subject`; stored in Postgres so it works across serverless instances. */
export async function hitRateLimit(rule: RateLimitRule, subject: string, now: Date = new Date()): Promise<RateLimitResult> {
  const key = rateLimitKey(rule, subject);
  const start = windowStart(now, rule.windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, ${start}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"`;
  const count = rows[0]?.count ?? 1;
  // Occasionally clear windows older than a day.
  if (Math.random() < 0.02) {
    await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } });
  }
  return { allowed: count <= rule.limit, retryAfter: retryAfterSeconds(now, rule.windowMs) };
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}
