import { NextResponse, type NextRequest } from "next/server";

/** The six account routes are private on the live site. */
const PROTECTED = [
  "/profile",
  "/wallet",
  "/transactions",
  "/orders",
  "/service-orders",
  "/security",
];

const SESSION_COOKIE = "menzu_session";

/**
 * Guards the account area and mirrors the live site's two redirects:
 *
 *   guest  -> /login?next=<path>   (same shape as the real "Mua Ngay" gate)
 *   signed in on /login -> /       (the live /login bounces you home)
 *
 * This only checks that a session cookie is present — it is a routing
 * concern, not authorisation. Every route handler still resolves the session
 * against the database, so a forged cookie gets past the redirect and then
 * fails properly at the data layer.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (needsAuth && !hasSession) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/profile/:path*",
    "/wallet/:path*",
    "/transactions/:path*",
    "/orders/:path*",
    "/service-orders/:path*",
    "/security/:path*",
  ],
};
