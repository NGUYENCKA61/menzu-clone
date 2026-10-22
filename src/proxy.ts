import { NextResponse, type NextRequest } from "next/server";

import { crossSiteRequest } from "@/lib/sameOrigin";

/** The six account routes are private on the live site. */
const PROTECTED = [
  "/profile",
  "/wallet",
  "/transactions",
  "/orders",
  "/security",
];

const SESSION_COOKIE = process.env.SESSION_COOKIE_NAME || "menzu_session";

/**
 * Runs before routes render — the file convention Next renamed from
 * `middleware`, because it can be deployed ahead of the app rather than
 * inside it.
 *
 * Guards the account area:
 *
 *   guest -> /login?next=<path>   (same shape as the real "Mua Ngay" gate)
 *
 * This only checks that a session cookie is PRESENT — a routing concern, not
 * authorisation. Every route handler still resolves the session against the
 * database, so a forged cookie gets past the redirect and then fails properly
 * at the data layer. That is the only direction a cookie can be read here
 * without lying: no cookie means certainly a guest.
 *
 * The reverse test — bouncing a signed-in visitor off /login — is NOT done
 * here, and must not be. A session id in this shop is an opaque random key
 * with nothing in it to check, so the presence of the cookie says nothing
 * about whether the session still exists: changing a password, signing other
 * devices out, an admin block, or simply thirty days of sitting there all
 * leave a dead cookie behind. Redirecting on that walled customers out of the
 * login page until they cleared the cookie by hand. /login and /signup make
 * the real check themselves, where the database is reachable.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Every write to the API from a page on another site is refused here, in
  // one place, rather than route by route (audit 22/10/2026). The session
  // cookie is SameSite=Lax, which keeps a modern browser from sending it
  // cross-site; this covers the browsers that predate that. A request with
  // neither Origin nor Sec-Fetch-Site (curl, a bot's server, a cron) is not
  // a browser riding on somebody's cookies and passes.
  if (
    pathname.startsWith("/api/") &&
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.method !== "OPTIONS" &&
    crossSiteRequest(request)
  ) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

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
    "/profile/:path*",
    "/wallet/:path*",
    "/transactions/:path*",
    "/orders/:path*",
    "/security/:path*",
    "/api/:path*",
  ],
};
