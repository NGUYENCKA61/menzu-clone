import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  hashPassword,
  newSessionToken,
  sessionExpiry,
  validateCredentials,
} from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    username?: string;
    password?: string;
    email?: string;
  } | null;

  const username = body?.username?.trim() ?? "";
  const password = body?.password ?? "";
  const email = body?.email?.trim() || null;

  const invalid = validateCredentials(username, password);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

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
