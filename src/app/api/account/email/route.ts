import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { text, trimmed } from "@/lib/jsonField";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Change the account's email address.
 *
 * The current password is asked for first. This address is where "Quên mật
 * khẩu" sends its link, so whoever can change it can take the account: a
 * stolen session cookie was otherwise enough to point the recovery mail at
 * the thief's own inbox and lock the owner out for good. An account that has
 * no password — one that only ever signed in through Google or Discord — has
 * nothing to check, and the provider it belongs to is the guard instead.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;
  const email = trimmed(body?.email);

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
  }

  const row = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (row.passwordHash) {
    const password = text(body?.password);
    if (!password) {
      return NextResponse.json(
        { error: "Nhập mật khẩu hiện tại để đổi email" },
        { status: 400 },
      );
    }
    if (!(await verifyPassword(password, row.passwordHash))) {
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng" },
        { status: 403 },
      );
    }
  }

  const taken = await db.user.findFirst({
    where: { email, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json(
      { error: "Email đã được sử dụng" },
      { status: 409 },
    );
  }

  // A typed address is a claim, not a fact — so the verification stamp goes
  // with the old one. Leaving it set would hand whoever edits this field the
  // ability to be linked into by somebody else's Google account.
  await db.user.update({
    where: { id: user.id },
    data: { email, emailVerifiedAt: null },
  });
  return NextResponse.json({ ok: true, email });
}
