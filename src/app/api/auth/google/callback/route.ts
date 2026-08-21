import { NextResponse } from "next/server";

import { SESSION_COOKIE, newSessionToken, sessionExpiry } from "@/lib/auth";
import { db } from "@/lib/db";
import { OAUTH_STATE_COOKIE, decodeState, findOrCreateOauthUser } from "@/lib/oauth";
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
  const session = await db.session.create({
    data: { id: newSessionToken(), userId: user.id, expiresAt: sessionExpiry() },
  });

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
