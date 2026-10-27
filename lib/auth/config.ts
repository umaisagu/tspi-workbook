import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { loginSchema } from "@/lib/schemas/auth";
import { RATE_LIMITS } from "@/lib/auth/rate-limit-window";
import { clientIp, hitRateLimit } from "@/lib/server/rate-limit";
import { dummyHash, verifyPassword } from "@/lib/server/password";

class RateLimitedError extends CredentialsSignin {
  override code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  secret: getEnv().AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt", maxAge: 7 * 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const ip = clientIp(request.headers);
        const [byEmail, byIp] = await Promise.all([
          hitRateLimit(RATE_LIMITS.loginEmail, email),
          hitRateLimit(RATE_LIMITS.loginIp, ip),
        ]);
        if (!byEmail.allowed || !byIp.allowed) throw new RateLimitedError();

        const user = await db.user.findUnique({ where: { email } });
        const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyHash()));
        if (!user || !valid || !user.isActive) return null;
        return { id: user.id, email: user.email, name: user.name, sessionVersion: user.sessionVersion };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.sv = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.sv = typeof token.sv === "number" ? token.sv : -1;
      return session;
    },
  },
}));
