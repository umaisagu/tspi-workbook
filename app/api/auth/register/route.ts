import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { isAllowedEmail } from "@/lib/auth/email";
import { RATE_LIMITS } from "@/lib/auth/rate-limit-window";
import { registerSchema } from "@/lib/schemas/auth";
import { HttpError, ok, parseJson, route } from "@/lib/server/http";
import { hashPassword } from "@/lib/server/password";
import { clientIp, hitRateLimit } from "@/lib/server/rate-limit";

export const POST = route(async (req) => {
  const limit = await hitRateLimit(RATE_LIMITS.registerIp, clientIp(req.headers));
  if (!limit.allowed) throw new HttpError(429, "Too many attempts. Please try again later.");

  const input = await parseJson(req, registerSchema);
  const domains = getEnv().ALLOWED_EMAIL_DOMAINS;
  if (!isAllowedEmail(input.email, domains)) {
    throw new HttpError(400, "Please correct the highlighted fields.", {
      email: [`Use your UNIMAS e-mail (${domains.map((d) => `@${d}`).join(" or ")}).`],
    });
  }
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) {
    throw new HttpError(409, "Please correct the highlighted fields.", {
      email: ["An account with this e-mail already exists. Sign in or reset your password."],
    });
  }
  // Everyone registers as a student; the lecturer assigns staff roles.
  await db.user.create({
    data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password), appRole: "STUDENT" },
  });
  return ok({ ok: true }, 201);
});
