import { NextResponse } from "next/server";

import { hashPassword, validateCredentials, verifyPassword } from "@/lib/auth";
import { text } from "@/lib/jsonField";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Change password — or set the first one.
 *
 * Requires the current password even though the caller already holds a valid
 * session: a stolen session should not be enough to lock the real owner out.
 * All sessions are dropped afterwards so a thief loses access.
 *
 * An account that arrived through Google or Discord has no password to ask
 * for, and demanding one made this endpoint impossible to satisfy — the
 * customer could never set one, and "Quên mật khẩu" could not help either
 * because it needs an address the provider verified, which Discord does not
 * always give. So a passwordless account sets its first password here, on the
 * strength of the session and the provider that issued it.
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
  const newPassword = text(body?.newPassword);
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
  // Null means there is no password yet — nothing to prove, and nothing an
  // attacker could have guessed either.
  if (row.passwordHash !== null) {
    if (!(await verifyPassword(currentPassword, row.passwordHash))) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng" },
        { status: 401 },
      );
    }
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Invalidate every session, including this one — the client re-authenticates.
  await db.session.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}
