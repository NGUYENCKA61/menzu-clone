import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  newSessionToken,
  sessionExpiry,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";

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

  // The live form accepts "Email hoặc Tên đăng nhập" in one field.
  const user = await db.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier }] },
  });

  // Same message and same work either way — do not leak which accounts exist.
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) {
    return NextResponse.json(
      { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
      { status: 401 },
    );
  }

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
