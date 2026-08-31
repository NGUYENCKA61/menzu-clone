import { NextResponse, type NextRequest } from "next/server";

/** The six account routes are private on the live site. */
const PROTECTED = [
  "/profile",
  "/wallet",
  "/transactions",
  "/orders",
  "/security",
];

const SESSION_COOKIE = "menzu_session";

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
  ],
};
