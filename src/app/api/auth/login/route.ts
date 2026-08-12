import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  newSessionToken,
  sessionExpiry,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/clientIp";
import {
  RETRY_AFTER_SECONDS,
  checkLoginRate,
  clearLoginAttempts,
  recordAttempt,
} from "@/lib/rateLimit";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    identifier?: string;
    password?: string;
  } | null;

  const identifier = body?.identifier?.trim() ?? "";
  const password = body?.password ?? "";

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
      { status: 400 },
    );
  }

  // Checked before touching the password so a locked-out caller cannot use
  // response timing to probe whether an account exists.
  const ip = clientIp(request);
  const rate = await checkLoginRate(identifier, ip);
  if (rate.blocked) {
    return NextResponse.json(
      { error: "Bạn đã thử sai quá nhiều lần. Vui lòng đợi 15 phút rồi thử lại." },
      { status: 429, headers: { "retry-after": String(RETRY_AFTER_SECONDS) } },
    );
  }

  // The live form accepts "Email hoặc Tên đăng nhập" in one field.
  const user = await db.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });

  // Same message and same work either way — do not leak which accounts exist.
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) {
    await recordAttempt("LOGIN", identifier, ip);
    return NextResponse.json(
      {
        error: "Tên đăng nhập hoặc mật khẩu không đúng",
        remaining: Math.max(0, rate.remaining - 1),
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
    data: { id: newSessionToken(), userId: user.id, expiresAt: sessionExpiry() },
  });

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
