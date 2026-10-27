import { db } from "@/lib/db";
import { resetPasswordSchema } from "@/lib/schemas/auth";
import { HttpError, ok, parseJson, route } from "@/lib/server/http";
import { hashPassword } from "@/lib/server/password";
import { hashResetToken } from "@/lib/server/reset-tokens";

export const POST = route(async (req) => {
  const input = await parseJson(req, resetPasswordSchema);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashResetToken(input.token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, "This reset link is invalid or has expired. Please request a new one.");
  }
  const passwordHash = await hashPassword(input.password);
  await db.$transaction([
    // Bumping sessionVersion signs the user out everywhere.
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 }, updatedById: record.userId },
    }),
    db.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
  return ok({ ok: true });
});
