import "server-only";
import { db } from "@/lib/db";

const DAY = 86_400_000;

/** Housekeeping for the daily cron: drop expired rate-limit windows and old password-reset tokens. */
export async function cleanup(now: Date = new Date()) {
  const [rateLimits, resetTokens] = await Promise.all([
    db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - DAY) } } }),
    db.passwordResetToken.deleteMany({ where: { OR: [{ expiresAt: { lt: new Date(now.getTime() - 7 * DAY) } }, { usedAt: { lt: new Date(now.getTime() - 7 * DAY) } }] } }),
  ]);
  return { rateLimits: rateLimits.count, resetTokens: resetTokens.count };
}
