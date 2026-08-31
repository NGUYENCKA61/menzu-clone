import { createHash, randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { clientIp } from "@/lib/clientIp";
import { trimmed } from "@/lib/jsonField";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { checkResetRate, recordAttempt } from "@/lib/rateLimit";
import { SITE_URL } from "@/lib/seo";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/** How long a reset link works. Short on purpose: it sits in an inbox. */
const RESET_TTL_MS = 30 * 60 * 1000;

/**
 * "Quên mật khẩu" — mints a one-shot link and mails it.
 *
 * The response is the same sentence whether the account exists, has no email,
 * or was found and mailed: anything more specific turns this endpoint into a
 * free oracle for "which usernames are real". The one honest exception is a
 * shop that has not configured SMTP at all — that is the shop's condition,
 * not the account's, and pretending to have sent mail nobody will ever get
 * strands the customer completely.
 *
 * Only the SHA-256 of the token is stored. A database leak therefore leaks
 * nothing that opens the reset page; the only copy of the real token rides in
 * the email.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    identifier?: string;
  } | null;
  const identifier = trimmed(body?.identifier);

  if (!identifier) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên đăng nhập hoặc email" },
      { status: 400 },
    );
  }

  const settings = await getShopSettings();
  if (!mailEnabled(settings)) {
    return NextResponse.json(
      {
        error:
          "Shop chưa cấu hình gửi email. Vui lòng liên hệ admin để được cấp lại mật khẩu.",
      },
      { status: 503 },
    );
  }

  const ip = clientIp(request);
  const rate = await checkResetRate(identifier, ip);
  if (rate.blocked) {
    return NextResponse.json(
      { error: "Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau." },
      { status: 429 },
    );
  }
  // Every request costs quota, found or not — otherwise probing is free.
  await recordAttempt("RESET", identifier, ip);

  const user = await db.user.findFirst({
    where: {
      OR: [
        { username: { equals: identifier, mode: "insensitive" } },
        { email: { equals: identifier, mode: "insensitive" } },
      ],
    },
  });

  if (user?.email && !user.blockedAt) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // One outstanding link per account: minting a new one voids the old,
    // which is what someone mashing the button expects to happen.
    await db.passwordReset.deleteMany({ where: { userId: user.id } });
    await db.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });

    // The configured public address wins over the one this request happened
    // to arrive at. Behind a proxy — or on a self-hosted box, where the server
    // binds 0.0.0.0 — the request's own origin is an address that means
    // nothing outside the machine, and the customer receives a mail whose link
    // cannot be clicked.
    //
    // A localhost value is ignored on purpose: it is the fallback a fresh
    // clone gets, and it is often left pointing at a port the developer is not
    // actually serving on, so the request itself is the better answer there.
    const configured = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|$)/.test(
      SITE_URL,
    )
      ? null
      : SITE_URL;
    const origin = configured ?? new URL(request.url).origin;
    const link = `${origin}/reset-password?token=${token}`;
    try {
      await sendMail(
        settings,
        user.email,
        `${settings.brandName} — Đặt lại mật khẩu`,
        [
          `Xin chào ${user.username},`,
          "",
          "Ai đó (hy vọng là bạn) vừa yêu cầu đặt lại mật khẩu cho tài khoản này.",
          `Nhấn vào đường dẫn sau trong vòng 30 phút để đặt mật khẩu mới:`,
          "",
          link,
          "",
          "Nếu không phải bạn, cứ bỏ qua email này — mật khẩu hiện tại vẫn nguyên.",
        ].join("\n"),
      );
    } catch {
      // The relay refused or timed out. This too must not become an oracle,
      // but a swallowed failure here means a customer waiting on mail that
      // never comes — so the link row is removed and the generic error shown.
      await db.passwordReset.deleteMany({ where: { userId: user.id } });
      return NextResponse.json(
        { error: "Không gửi được email. Vui lòng thử lại sau." },
        { status: 502 },
      );
    }
  }

  return NextResponse.json({
    message:
      "Nếu tài khoản tồn tại và có email, đường dẫn đặt lại đã được gửi. Kiểm tra cả hộp thư rác.",
  });
}
