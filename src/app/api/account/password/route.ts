import { NextResponse } from "next/server";

import { hashPassword, validateCredentials, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Change password.
 *
 * Requires the current password even though the caller already holds a valid
 * session — a stolen session should not be enough to lock the real owner out.
 * All other sessions are dropped afterwards so a thief loses access.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  } | null;

  const currentPassword = body?.currentPassword ?? "";
  const newPassword = body?.newPassword ?? "";
  const confirmPassword = body?.confirmPassword ?? "";

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: "Mật khẩu xác nhận không khớp" },
      { status: 400 },
    );
  }

  const invalid = validateCredentials(user.username, newPassword);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await verifyPassword(currentPassword, row.passwordHash))) {
    return NextResponse.json(
      { error: "Mật khẩu hiện tại không đúng" },
      { status: 401 },
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Invalidate every session, including this one — the client re-authenticates.
  await db.session.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}
