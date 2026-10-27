import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { RATE_LIMITS } from "@/lib/auth/rate-limit-window";
import { forgotPasswordSchema } from "@/lib/schemas/auth";
import { HttpError, ok, parseJson, route } from "@/lib/server/http";
import { sendMail } from "@/lib/server/mail";
import { clientIp, hitRateLimit } from "@/lib/server/rate-limit";
import { RESET_TOKEN_TTL_MS, newResetToken } from "@/lib/server/reset-tokens";

// Always answers the same way, so it cannot be used to discover which e-mails have accounts.
export const POST = route(async (req) => {
  const { email } = await parseJson(req, forgotPasswordSchema);
  const [byEmail, byIp] = await Promise.all([
    hitRateLimit(RATE_LIMITS.resetEmail, email),
    hitRateLimit(RATE_LIMITS.resetIp, clientIp(req.headers)),
  ]);
  if (!byIp.allowed) throw new HttpError(429, "Too many requests. Please try again later.");

  const user = byEmail.allowed ? await db.user.findUnique({ where: { email } }) : null;
  if (user && user.isActive) {
    const { token, tokenHash } = newResetToken();
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
    });
    const link = `${getEnv().APP_URL.replace(/\/$/, "")}/reset-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: "TSPi Workbook password reset",
      text: `Hello ${user.name},\n\nUse this link within one hour to choose a new password:\n${link}\n\nIf you did not ask for this, you can ignore this e-mail.`,
    });
  }
  return ok({ ok: true });
});
