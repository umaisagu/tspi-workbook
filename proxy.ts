import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, newNonce } from "@/lib/security/csp";

// Optimistic check only: send visitors without a session cookie to /login.
// Real authentication and authorisation happen on the server in every page and API route.
// Every page response also gets a per-request Content-Security-Policy nonce (Next applies it to its scripts).
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

function withCsp(request: NextRequest, response: (headers: Headers) => NextResponse): NextResponse {
  const csp = buildCsp({
    nonce: newNonce(),
    dev: process.env.NODE_ENV === "development",
    https: request.nextUrl.protocol === "https:",
  });
  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", csp);
  const res = response(headers);
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const next = (headers: Headers) => NextResponse.next({ request: { headers } });
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return withCsp(request, next);
  const hasSession =
    request.cookies.has("authjs.session-token") || request.cookies.has("__Secure-authjs.session-token");
  if (hasSession) return withCsp(request, next);
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes (they return 401 themselves and are not HTML), Next internals, static files and prefetches.
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
