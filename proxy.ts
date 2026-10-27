import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: send visitors without a session cookie to /login.
// Real authentication and authorisation happen on the server in every page and API route.
const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  const hasSession =
    request.cookies.has("authjs.session-token") || request.cookies.has("__Secure-authjs.session-token");
  if (hasSession) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes (they return 401 themselves), Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)"],
};
