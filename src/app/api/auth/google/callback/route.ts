import { NextResponse } from "next/server";

import { SESSION_COOKIE, newSessionToken, sessionExpiry } from "@/lib/auth";
import { clientIp } from "@/lib/clientIp";
import { db } from "@/lib/db";
import { resolveSessionLocation } from "@/lib/device";
import { OAUTH_STATE_COOKIE, decodeState, findOrCreateOauthUser } from "@/lib/oauth";
import { getCurrentUser } from "@/lib/session";
import { googleOauthEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/**
 * Step two: Google sends the visitor back with a code; the code is traded for
 * a profile, the profile for a shop user, the user for a session.
 *
 * Every failure lands on /login with a short machine-readable reason — the
 * form turns it into a toast. Failures here are Google's screen or a cookie
 * that lapsed, none of which the visitor can fix on this URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/login?oauthError=${code}`, url.origin));

  const settings = await getShopSettings();
  if (!googleOauthEnabled(settings)) return fail("off");

  const cookies = request.headers.get("cookie") ?? "";
  const rawState = /(?:^|;\s*)menzu_oauth_state=([^;]+)/.exec(cookies)?.[1];
  const stored = decodeState(rawState ? decodeURIComponent(rawState) : undefined);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !stored || stored.state !== state) return fail("state");

  const token = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: settings.googleClientId,
      client_secret: settings.googleClientSecret,
      redirect_uri: `${url.origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const accessToken = (token as { access_token?: string } | null)?.access_token;
  if (!accessToken) return fail("exchange");

  const profile = (await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  } | null;
  if (!profile?.sub) return fail("profile");

  // A visitor who is already signed in is linking, not signing in: the
  // identity is attached to the account they hold and their session stays
  // theirs. Without this branch, the "Liên kết" button on /profile would
  // quietly switch them into whichever account the identity resolves to.
  const current = await getCurrentUser();
  if (current) {
    const owned = await db.linkedAccount.findUnique({
      where: {
        provider_providerId: { provider: "google", providerId: profile.sub },
      },
    });
    if (!owned) {
      await db.linkedAccount.create({
        data: { userId: current.id, provider: "google", providerId: profile.sub },
      });
    }
    // Back to whichever page offered the button — /profile and /security
    // both do — with the outcome riding as a query it knows how to show.
    const target = new URL(stored.next, url.origin);
    target.searchParams.set(
      owned && owned.userId !== current.id ? "linkError" : "linked",
      "google",
    );
    const response = NextResponse.redirect(target);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  }

  const user = await findOrCreateOauthUser({
    provider: "google",
    providerId: profile.sub,
    // Unverified addresses are dropped rather than trusted: linking by an
    // address Google has not confirmed would let anyone claim any account.
    email: profile.email_verified ? (profile.email ?? null) : null,
    displayName: profile.name ?? "google user",
  });
  if (!user) return fail("blocked");

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  const ip = clientIp(request);
  const session = await db.session.create({
    data: {
      id: newSessionToken(),
      userId: user.id,
      expiresAt: sessionExpiry(),
      ip,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
  // Un-awaited on purpose: the town name can arrive after the redirect does.
  void resolveSessionLocation(session.id, ip);

  const response = NextResponse.redirect(new URL(stored.next, url.origin));
  response.cookies.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}
