import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  newSessionToken,
  sessionExpiry,
  verifyPassword,
} from "@/lib/auth";
import { text, trimmed } from "@/lib/jsonField";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/clientIp";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { resolveSessionLocation } from "@/lib/device";
import {
  CAPTCHA_AFTER_FAILURES,
  RETRY_AFTER_SECONDS,
  checkLoginRate,
  clearLoginAttempts,
  recordAttempt,
} from "@/lib/rateLimit";
import { getShopSettings } from "@/lib/settingsStore";
import { TURNSTILE_FAILED, turnstileEnabled } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstileVerify";

export async function POST(request: Request) {
  // Refused before anything is read: a page on another site posting the
  // attacker's own credentials here would sign the visitor into the
  // attacker's account, and every đồng they topped up afterwards would be
  // topping up somebody else's wallet.
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    identifier?: string;
    password?: string;
    turnstileToken?: string;
  } | null;

  const identifier = trimmed(body?.identifier);
  const password = text(body?.password);

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
      { status: 400 },
    );
  }

  // Checked before touching the password so a locked-out caller cannot use
  // response timing to probe whether an account exists.
  const ip = clientIp(request);

  const settings = await getShopSettings();
  const rate = await checkLoginRate(identifier, ip);
  if (rate.blocked) {
    return NextResponse.json(
      { error: "Bạn đã thử sai quá nhiều lần. Vui lòng đợi 5 phút rồi thử lại." },
      { status: 429, headers: { "retry-after": String(RETRY_AFTER_SECONDS) } },
    );
  }

  /**
   * The CAPTCHA earns its place instead of standing at the door: it is only
   * demanded once this identifier has a few failures on the clock, so an
   * honest customer signing in never sees it and a guessing script meets it
   * on try four. Verified here on the server, before any password work — the
   * widget in the browser proves nothing on its own, and only a shop that has
   * filled in both keys is asking Cloudflare at all.
   *
   * `captchaRequired` rides every refusal so the form knows to reveal the
   * widget for the next attempt the moment it becomes necessary.
   */
  const captchaNow =
    turnstileEnabled(settings) && rate.failures >= CAPTCHA_AFTER_FAILURES;
  if (captchaNow) {
    const outcome = await verifyTurnstile(
      body?.turnstileToken ?? "",
      settings.turnstileSecretKey,
      ip,
    );
    if (!outcome.ok) {
      // Counted as a failed attempt: an endpoint that refuses without
      // recording anything is one somebody can hammer for free.
      await recordAttempt("LOGIN", identifier, ip);
      return NextResponse.json(
        { error: TURNSTILE_FAILED, captchaRequired: true },
        { status: 400 },
      );
    }
  }

  // The live form accepts "Email hoặc Tên đăng nhập" in one field. Matched
  // without case: registration refuses a name that differs from an existing
  // one only in capitals, so there is exactly one row this can find, and a
  // customer typing "Admin" for the account they created as "admin" gets in
  // rather than being told their password is wrong.
  const user = await db.user.findFirst({
    where: {
      OR: [
        { username: { equals: identifier, mode: "insensitive" } },
        { email: { equals: identifier, mode: "insensitive" } },
      ],
    },
  });

  // Same message and same work either way — do not leak which accounts exist.
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) {
    await recordAttempt("LOGIN", identifier, ip);
    return NextResponse.json(
      {
        error: "Tên đăng nhập hoặc mật khẩu không đúng",
        remaining: Math.max(0, rate.remaining - 1),
        // This failure just went on the clock, so the next try is judged
        // against failures + 1 — tell the form now, not one refusal late.
        captchaRequired:
          turnstileEnabled(settings) &&
          rate.failures + 1 >= CAPTCHA_AFTER_FAILURES,
      },
      { status: 401 },
    );
  }

  // Checked after the password, deliberately: refusing a blocked account
  // before verifying would tell an attacker which usernames exist.
  if (user.blockedAt) {
    return NextResponse.json(
      { error: "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ." },
      { status: 403 },
    );
  }

  await clearLoginAttempts(identifier);

  // Recorded for support lookups. Best-effort by nature — it comes from a
  // proxy header a client can set — so it is a hint, never an identity check.
  await db.user.update({
    where: { id: user.id },
    data: { lastIp: ip, lastLoginAt: new Date() },
  });

  const session = await db.session.create({
    data: {
      id: newSessionToken(),
      userId: user.id,
      expiresAt: sessionExpiry(),
      ip,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
  // Un-awaited on purpose: the town name can arrive after the response does.
  void resolveSessionLocation(session.id, ip);

  const response = NextResponse.json({
    user: {
      uid: user.uid,
      username: user.username,
      balance: Number(user.balance),
      points: user.points,
    },
  });
  response.cookies.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expiresAt,
  });
  return response;
}
