import { NextResponse } from "next/server";

import { OAUTH_STATE_COOKIE, encodeState, newOauthState } from "@/lib/oauth";
import { discordOauthEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/** Discord's half of what /api/auth/google does — see that file for the why. */
export async function GET(request: Request) {
  const settings = await getShopSettings();
  if (!discordOauthEnabled(settings)) {
    return NextResponse.redirect(new URL("/login?oauthError=off", request.url));
  }

  const url = new URL(request.url);
  const state = newOauthState(url.searchParams.get("next"));

  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("client_id", settings.discordClientId);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/auth/discord/callback`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "identify email");
  authorize.searchParams.set("state", state.state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set(OAUTH_STATE_COOKIE, encodeState(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
