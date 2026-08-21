import { NextResponse } from "next/server";

import { OAUTH_STATE_COOKIE, encodeState, newOauthState } from "@/lib/oauth";
import { googleOauthEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/**
 * Step one of "Đăng nhập bằng Google": mint a state, remember it in a cookie,
 * and hand the visitor to Google's consent screen.
 *
 * The redirect URI is built from this request's own origin, so the same code
 * serves localhost and the future domain — each just has to be registered in
 * the Google console.
 */
export async function GET(request: Request) {
  const settings = await getShopSettings();
  if (!googleOauthEnabled(settings)) {
    return NextResponse.redirect(new URL("/login?oauthError=off", request.url));
  }

  const url = new URL(request.url);
  const state = newOauthState(url.searchParams.get("next"));

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", settings.googleClientId);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/auth/google/callback`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email profile");
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
