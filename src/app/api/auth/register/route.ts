import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  hashPassword,
  newSessionToken,
  sessionExpiry,
  validateCredentials,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/clientIp";
import {
  CAPTCHA_AFTER_REGISTRATIONS,
  REGISTER_RETRY_AFTER_SECONDS,
  checkRegisterRate,
  recordAttempt,
} from "@/lib/rateLimit";
import { getShopSettings } from "@/lib/settingsStore";
import { TURNSTILE_FAILED, turnstileEnabled } from "@/lib/turnstile";
import { verifyTurnstile } from "@/lib/turnstileVerify";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
    email?: string;
    turnstileToken?: string;
  } | null;

  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  const email = body?.email?.trim() || null;

  const invalid = validateCredentials(username, password);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const ip = clientIp(request);

  const settings = await getShopSettings();
  const rate = await checkRegisterRate(ip);
  if (rate.blocked) {
    return NextResponse.json(
      { error: "Đã tạo quá nhiều tài khoản từ thiết bị này. Vui lòng thử lại sau." },
      { status: 429, headers: { "retry-after": String(REGISTER_RETRY_AFTER_SECONDS) } },
    );
  }

  /**
   * As on sign-in, the CAPTCHA earns its place: the first accounts from an
   * address sign up without it, and only a device that keeps creating more
   * within the hour is asked to prove a human is present. Verified on the
   * server — the widget alone proves nothing — and skipped entirely while
   * the shop has no keys configured.
   */
  const captchaNow =
    turnstileEnabled(settings) && rate.failures >= CAPTCHA_AFTER_REGISTRATIONS;
  if (captchaNow) {
    const outcome = await verifyTurnstile(
      body?.turnstileToken ?? "",
      settings.turnstileSecretKey,
      ip,
    );
    if (!outcome.ok) {
      await recordAttempt("REGISTER", username, ip);
      return NextResponse.json(
        { error: TURNSTILE_FAILED, captchaRequired: true },
        { status: 400 },
      );
    }
  }

  const clash = await db.user.findFirst({
    where: { OR: [{ username }, ...(email ? [{ email }] : [])] },
    select: { username: true, email: true },
  });
  if (clash) {
    return NextResponse.json(
      {
        error:
          clash.username === username
            ? "Tên đăng nhập đã tồn tại"
            : "Email đã được sử dụng",
      },
      { status: 409 },
    );
  }

  const user = await db.user.create({
    data: { username, email, passwordHash: await hashPassword(password) },
  });

  await recordAttempt("REGISTER", username, ip);

  const session = await db.session.create({
    data: { id: newSessionToken(), userId: user.id, expiresAt: sessionExpiry() },
  });

  const response = NextResponse.json({
    user: { uid: user.uid, username: user.username, balance: 0, points: 0 },
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
