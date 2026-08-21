import { NextResponse } from "next/server";

import { SESSION_COOKIE, newSessionToken, sessionExpiry } from "@/lib/auth";
import { db } from "@/lib/db";
import { OAUTH_STATE_COOKIE, decodeState, findOrCreateOauthUser } from "@/lib/oauth";
import { discordOauthEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/** Discord's half of the Google callback — same shape, Discord's endpoints. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/login?oauthError=${code}`, url.origin));

  const settings = await getShopSettings();
  if (!discordOauthEnabled(settings)) return fail("off");

  const cookies = request.headers.get("cookie") ?? "";
  const rawState = /(?:^|;\s*)menzu_oauth_state=([^;]+)/.exec(cookies)?.[1];
  const stored = decodeState(rawState ? decodeURIComponent(rawState) : undefined);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !stored || stored.state !== state) return fail("state");

  const token = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: settings.discordClientId,
      client_secret: settings.discordClientSecret,
      redirect_uri: `${url.origin}/api/auth/discord/callback`,
      grant_type: "authorization_code",
    }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const accessToken = (token as { access_token?: string } | null)?.access_token;
  if (!accessToken) return fail("exchange");

  const profile = (await fetch("https://discord.com/api/users/@me", {
    headers: { authorization: `Bearer ${accessToken}` },
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)) as {
    id?: string;
    username?: string;
    global_name?: string | null;
    email?: string | null;
    verified?: boolean;
    avatar?: string | null;
  } | null;
  if (!profile?.id) return fail("profile");

  const user = await findOrCreateOauthUser({
    provider: "discord",
    providerId: profile.id,
    email: profile.verified ? (profile.email ?? null) : null,
    displayName: profile.global_name ?? profile.username ?? "discord user",
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
