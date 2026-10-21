import { NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailBrand } from "@/lib/emailBrand";
import {
  EMAIL_CHANGE_UNLOCK_MINUTES,
  MAX_ATTEMPTS,
  emailChangeOpen,
  hashCode,
  sameHash,
} from "@/lib/emailOtp";
import { emailChangedMail } from "@/lib/emailTemplates";
import { text } from "@/lib/jsonField";
import { sendMail } from "@/lib/mailer";
import { getCurrentUser } from "@/lib/session";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/**
 * The old inbox hears that the address moved, so a change its owner did not
 * make is noticed where it can still be acted on. Never awaited by the
 * change: a mail server that does not answer must not undo a proved address.
 */
async function tellOldInbox(oldEmail: string, username: string, newEmail: string): Promise<void> {
  try {
    const settings = await getShopSettings();
    if (!mailEnabled(settings)) return;
    const mail = emailChangedMail({
      brand: emailBrand(settings),
      username,
      oldEmail,
      newEmail,
      changedAt: new Date(),
    });
    await sendMail(settings, oldEmail, mail.subject, mail.text, mail.html);
  } catch (error) {
    console.error("[email-change-mail]", error);
  }
}

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
    select: {
      email: true,
      emailVerifiedAt: true,
      emailChangeUnlockedUntil: true,
      passwordHash: true,
      username: true,
    },
  });
  const changing = (account.email ?? "").toLowerCase() !== row.email.toLowerCase();

  // The proved address answering its own code: nothing moves yet, the
  // account only gains a window in which a new address may be set (the
  // owner, 21/10/2026: "đổi mail mà không cần xác thực mail cũ à").
  if (!changing && account.emailVerifiedAt) {
    const until = new Date(Date.now() + EMAIL_CHANGE_UNLOCK_MINUTES * 60 * 1000);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { emailChangeUnlockedUntil: until } }),
      db.emailVerification.deleteMany({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ ok: true, unlocked: true, minutes: EMAIL_CHANGE_UNLOCK_MINUTES });
  }

  // A move away from a proved address needs that window, checked here too
  // and not only when the code was sent, so the window cannot be skipped by
  // sending the code first and waiting.
  if (changing && account.emailVerifiedAt) {
    if (!emailChangeOpen(account.emailChangeUnlockedUntil)) {
      return NextResponse.json(
        { error: "Hãy nhận mã ở email cũ trước, rồi mới đổi sang email mới.", needOldCode: true },
        { status: 403 },
      );
    }
  }

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
      data: { email: row.email, emailVerifiedAt: new Date(), emailChangeUnlockedUntil: null },
    }),
    db.emailVerification.deleteMany({ where: { userId: user.id } }),
  ]);
  if (changing && account.email && account.emailVerifiedAt) {
    void tellOldInbox(account.email, account.username, row.email);
  }
  return NextResponse.json({ ok: true, email: row.email });
}
