import { NextResponse } from "next/server";

import { SESSION_COOKIE, newSessionToken, sessionExpiry } from "@/lib/auth";
import { clientIp } from "@/lib/clientIp";
import { db } from "@/lib/db";
import { resolveSessionLocation } from "@/lib/device";
import { OAUTH_STATE_COOKIE, decodeState, findOrCreateOauthUser } from "@/lib/oauth";
import { getCurrentUser } from "@/lib/session";
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

  // Signed-in visitors are linking, not signing in — see the Google callback.
  const current = await getCurrentUser();
  if (current) {
    const owned = await db.linkedAccount.findUnique({
      where: {
        provider_providerId: { provider: "discord", providerId: profile.id },
      },
    });
    if (!owned) {
      await db.linkedAccount.create({
        data: { userId: current.id, provider: "discord", providerId: profile.id },
      });
    }
    // Back to whichever page offered the button — see the Google callback.
    const target = new URL(stored.next, url.origin);
    target.searchParams.set(
      owned && owned.userId !== current.id ? "linkError" : "linked",
      "discord",
    );
    const response = NextResponse.redirect(target);
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  }

  const resolved = await findOrCreateOauthUser({
    provider: "discord",
    providerId: profile.id,
    email: profile.verified ? (profile.email ?? null) : null,
    displayName: profile.global_name ?? profile.username ?? "discord user",
  });
  if (!resolved.ok) return fail(resolved.reason);
  const user = resolved.user;

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
