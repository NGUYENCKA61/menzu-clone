import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  hashPassword,
  newSessionToken,
  sessionExpiry,
  validateCredentials,
} from "@/lib/auth";
import { text, trimmed } from "@/lib/jsonField";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/clientIp";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { resolveSessionLocation } from "@/lib/device";
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
  // Same guard as sign-in: a form on another site must not be able to create
  // an account in the visitor's browser and sign them into it.
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
    email?: string;
    turnstileToken?: string;
    ref?: string;
  } | null;

  const username = trimmed(body?.username);
  const password = text(body?.password);
  const email = trimmed(body?.email) || null;

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

  // Compared without case, both of them. "Admin" and "admin" are the same
  // name to every customer who reads it, and letting both exist made signing
  // in a coin toss between two accounts — the same for an address, which mail
  // servers do not case-fold either.
  const clash = await db.user.findFirst({
    where: {
      OR: [
        { username: { equals: username, mode: "insensitive" } },
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
      ],
    },
    select: { username: true, email: true },
  });
  if (clash) {
    return NextResponse.json(
      {
        error:
          clash.username.toLowerCase() === username.toLowerCase()
            ? "Tên đăng nhập đã tồn tại"
            : "Email đã được sử dụng",
      },
      { status: 409 },
    );
  }

  const user = await db.user.create({
    data: { username, email, passwordHash: await hashPassword(password) },
  });

  // The referral handshake: /register?ref=<uid> rode along in the body.
  // Best-effort — a bad code just means no referrer, never a failed signup.
  const refUid = Number(body?.ref ?? "");
  if (Number.isInteger(refUid) && refUid > 0) {
    const referrer = await db.user.findUnique({
      where: { uid: refUid },
      select: { id: true },
    });
    if (referrer && referrer.id !== user.id) {
      await db.user.update({
        where: { id: user.id },
        data: { referredById: referrer.id },
      });
    }
  }

  await recordAttempt("REGISTER", username, ip);

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
