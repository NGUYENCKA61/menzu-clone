import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Spends a reset link: token in, new password set, every session revoked.
 *
 * The token is matched by its SHA-256 — the table never saw the real thing —
 * and must be unspent and unexpired. Marking `usedAt` before touching the
 * password makes the link single-shot even if the same request lands twice.
 *
 * All sessions die with the old password. The one person guaranteed to hold a
 * fresh session right now is whoever just proved control of the inbox; anyone
 * else still signed in is exactly who the customer is resetting to get rid of.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    password?: string;
  } | null;

  const token = body?.token?.trim() ?? "";
  const password = body?.password ?? "";

  if (!token) {
    return NextResponse.json(
      { error: "Đường dẫn đặt lại không hợp lệ" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "Mật khẩu phải có ít nhất 6 ký tự" },
      { status: 400 },
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const reset = await db.passwordReset.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, blockedAt: true } } },
  });

  if (!reset || reset.usedAt || reset.expiresAt < new Date() || reset.user.blockedAt) {
    return NextResponse.json(
      { error: "Đường dẫn đặt lại không hợp lệ hoặc đã hết hạn. Hãy yêu cầu lại." },
      { status: 400 },
    );
  }

  await db.passwordReset.update({
    where: { id: reset.id },
    data: { usedAt: new Date() },
  });
  await db.user.update({
    where: { id: reset.user.id },
    data: { passwordHash: await hashPassword(password) },
  });
  await db.session.deleteMany({ where: { userId: reset.user.id } });

  return NextResponse.json({
    message: "Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.",
  });
}
