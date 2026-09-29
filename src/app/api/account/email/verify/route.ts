import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_ATTEMPTS, hashCode, sameHash } from "@/lib/emailOtp";
import { text } from "@/lib/jsonField";
import { getCurrentUser } from "@/lib/session";

/**
 * The code from "Gửi mã OTP", typed back. Right, and the address it went to
 * becomes the account's email, marked verified.
 *
 * Moving to a different address also asks for the current password, when the
 * account has one. This address is where "Quên mật khẩu" sends its link, so a
 * stolen session cookie plus an inbox the thief controls would otherwise be
 * enough to take the account; the code proves the new inbox, the password
 * proves the person. Confirming the address already on file needs only the
 * code. A wrong password spends an attempt, like a wrong code.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    password?: unknown;
  } | null;
  const code = String(body?.code ?? "").replace(/\D/g, "");
  if (code.length !== 6) {
    return NextResponse.json({ error: "Nhập đủ 6 số của mã xác minh" }, { status: 400 });
  }

  const row = await db.emailVerification.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Mã đã hết hạn. Hãy gửi lại mã." }, { status: 400 });
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Nhập sai quá nhiều lần. Hãy gửi lại mã mới." },
      { status: 429 },
    );
  }

  const spend = async (message: string, status: number) => {
    await db.emailVerification.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return NextResponse.json(
      { error: left > 0 ? `${message} (còn ${left} lần thử).` : "Nhập sai quá nhiều lần. Hãy gửi lại mã mới." },
      { status },
    );
  };

  if (!sameHash(row.codeHash, hashCode(user.id, row.email, code))) {
    return spend("Mã xác minh không đúng", 400);
  }

  const account = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { email: true, passwordHash: true },
  });
  const changing = (account.email ?? "").toLowerCase() !== row.email.toLowerCase();
  if (changing && account.passwordHash) {
    const password = text(body?.password);
    if (!password) {
      return NextResponse.json(
        { error: "Nhập mật khẩu hiện tại để đổi email" },
        { status: 400 },
      );
    }
    if (!(await verifyPassword(password, account.passwordHash))) {
      return spend("Mật khẩu hiện tại không đúng", 403);
    }
  }

  const taken = await db.user.findFirst({
    where: { email: { equals: row.email, mode: "insensitive" }, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json({ error: "Email đã được sử dụng" }, { status: 409 });
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { email: row.email, emailVerifiedAt: new Date() },
    }),
    db.emailVerification.deleteMany({ where: { userId: user.id } }),
  ]);
  return NextResponse.json({ ok: true, email: row.email });
}
