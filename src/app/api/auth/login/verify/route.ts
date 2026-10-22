import { NextResponse } from "next/server";

import { verifyAdminChallenge } from "@/lib/adminLogin";
import { SESSION_COOKIE, newSessionToken, sessionExpiry } from "@/lib/auth";
import { clientIp } from "@/lib/clientIp";
import { db } from "@/lib/db";
import { resolveSessionLocation } from "@/lib/device";
import { crossSiteRequest } from "@/lib/sameOrigin";

/**
 * The second half of an admin's sign-in: the code that went out after the
 * password comes back, and only then is the session made, the same session
 * /api/auth/login makes for everyone else.
 */
export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as {
    challengeId?: unknown;
    code?: unknown;
  } | null;
  const challengeId = typeof body?.challengeId === "string" ? body.challengeId.trim() : "";
  const code = String(body?.code ?? "").replace(/\D/g, "");
  if (!challengeId || code.length !== 6) {
    return NextResponse.json({ error: "Nhập đủ 6 số của mã" }, { status: 400 });
  }

  const result = await verifyAdminChallenge(challengeId, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const user = await db.user.findUnique({ where: { id: result.userId } });
  if (!user || user.blockedAt) {
    return NextResponse.json(
      { error: "Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ." },
      { status: 403 },
    );
  }

  const ip = clientIp(request);
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
