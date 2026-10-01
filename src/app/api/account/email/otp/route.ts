import { randomInt } from "node:crypto";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import {
  EMAIL_RE,
  OTP_TTL_MINUTES,
  SEND_COOLDOWN_SECONDS,
  SENDS_PER_HOUR,
  hashCode,
} from "@/lib/emailOtp";
import { trimmed } from "@/lib/jsonField";
import { sendMail } from "@/lib/mailer";
import { getCurrentUser } from "@/lib/session";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/**
 * "Gửi mã OTP" on Bảo mật: mails a six-digit code to the address typed, to be
 * typed back at /api/account/email/verify. Nothing about the account changes
 * here — the address only becomes the account's once the code comes back.
 *
 * Throttled per account (a cooldown between sends, a ceiling per hour) off the
 * rows this table keeps for the hour anyway.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = trimmed(body?.email);
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Email không hợp lệ" }, { status: 400 });
  }

  const settings = await getShopSettings();
  if (!mailEnabled(settings)) {
    return NextResponse.json(
      { error: "Shop chưa bật gửi email nên chưa gửi được mã xác minh." },
      { status: 503 },
    );
  }

  const account = await db.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { email: true, emailVerifiedAt: true, username: true },
  });
  if (account.email?.toLowerCase() === email.toLowerCase() && account.emailVerifiedAt) {
    return NextResponse.json({ error: "Email này đã được xác minh" }, { status: 400 });
  }
  const taken = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, NOT: { id: user.id } },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json({ error: "Email đã được sử dụng" }, { status: 409 });
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.emailVerification.findMany({
    where: { userId: user.id, createdAt: { gte: hourAgo } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const since = recent[0] ? (Date.now() - recent[0].createdAt.getTime()) / 1000 : Infinity;
  if (since < SEND_COOLDOWN_SECONDS) {
    const wait = Math.ceil(SEND_COOLDOWN_SECONDS - since);
    return NextResponse.json(
      { error: `Vui lòng đợi ${wait} giây rồi gửi lại mã.`, retryAfter: wait },
      { status: 429 },
    );
  }
  if (recent.length >= SENDS_PER_HOUR) {
    return NextResponse.json(
      { error: "Bạn đã gửi mã quá nhiều lần. Thử lại sau 1 giờ." },
      { status: 429 },
    );
  }
  // Rows past the hour have nothing left to count or check.
  await db.emailVerification.deleteMany({ where: { userId: user.id, createdAt: { lt: hourAgo } } });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const row = await db.emailVerification.create({
    data: {
      userId: user.id,
      email,
      codeHash: hashCode(user.id, email, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });

  try {
    await sendMail(
      settings,
      email,
      `${settings.brandName} | Mã xác minh email: ${code}`,
      [
        `Xin chào ${account.username},`,
        "",
        `Mã xác minh email của bạn là: ${code}`,
        `Mã có hiệu lực trong ${OTP_TTL_MINUTES} phút. Nhập mã này ở trang Bảo mật tài khoản.`,
        "",
        "Nếu không phải bạn yêu cầu, cứ bỏ qua email này, tài khoản của bạn không thay đổi gì.",
      ].join("\n"),
    );
  } catch {
    // Not counted against them: nothing reached anyone.
    await db.emailVerification.delete({ where: { id: row.id } }).catch(() => {});
    return NextResponse.json(
      { error: "Không gửi được email. Kiểm tra lại địa chỉ hoặc thử lại sau." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    email,
    ttlMinutes: OTP_TTL_MINUTES,
    retryAfter: SEND_COOLDOWN_SECONDS,
  });
}
