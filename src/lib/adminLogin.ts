import "server-only";

import { createHash, randomInt, randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { emailBrand } from "@/lib/emailBrand";
import { sameHash } from "@/lib/emailOtp";
import { emailCodeMail } from "@/lib/emailTemplates";
import { sendMail } from "@/lib/mailer";
import { mailEnabled, type ShopSettings } from "@/lib/settings";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";

/**
 * The second step of an admin's sign-in (audit 01/10/2026: no 2FA). The
 * password was right; a six-digit code goes to every admin of the shop's
 * Telegram channel and to the admin's own verified mailbox, and the session
 * is only made at /api/auth/login/verify when the code comes back.
 *
 * Fails closed: with no channel able to carry the code, nobody signs in, and
 * the refusal says what to configure. On the dev server the code is also
 * printed to the console, so the flow can be walked without a bot.
 */

/** How long a sent code works, and how many wrong codes one survives. */
export const ADMIN_CODE_TTL_MINUTES = 5;
export const ADMIN_CODE_MAX_ATTEMPTS = 5;

/** Bound to the challenge, so a code sent for one can never answer another. */
export function challengeHash(challengeId: string, code: string): string {
  return createHash("sha256").update(`${challengeId}:${code}`).digest("hex");
}

export type AdminCodeDelivery =
  | { ok: true; channels: string[] }
  | { ok: false; error: string };

export async function startAdminChallenge(input: {
  settings: ShopSettings;
  user: { id: string; username: string; email: string | null; emailVerifiedAt: Date | null };
  ip: string;
  userAgent: string | null;
}): Promise<{ id: string; delivery: AdminCodeDelivery }> {
  const { settings, user } = input;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const id = randomUUID();

  // One live challenge per admin: a fresh sign-in retires the earlier code.
  await db.adminLoginChallenge.deleteMany({ where: { userId: user.id } });
  await db.adminLoginChallenge.create({
    data: {
      id,
      userId: user.id,
      codeHash: challengeHash(id, code),
      expiresAt: new Date(Date.now() + ADMIN_CODE_TTL_MINUTES * 60 * 1000),
      ip: input.ip,
      userAgent: input.userAgent,
    },
  });

  const channels: string[] = [];
  if (settings.telegramBotToken.trim() && settings.telegramChatId.trim()) {
    try {
      await notifyTelegramAdmins(
        [
          `🔐 <b>Mã đăng nhập admin: ${code}</b>`,
          escapeTelegramHtml(
            `Tài khoản ${user.username}, từ IP ${input.ip}. Mã hết hạn sau ${ADMIN_CODE_TTL_MINUTES} phút. Không phải bạn đang đăng nhập thì đổi mật khẩu ngay.`,
          ),
        ].join("\n"),
      );
      channels.push("Telegram");
    } catch (error) {
      console.error("[admin-login] telegram", error);
    }
  }
  if (mailEnabled(settings) && user.email && user.emailVerifiedAt) {
    try {
      const mail = emailCodeMail({
        brand: emailBrand(settings),
        username: user.username,
        code,
        ttlMinutes: ADMIN_CODE_TTL_MINUTES,
      });
      await sendMail(settings, user.email, mail.subject, mail.text, mail.html);
      channels.push("email");
    } catch (error) {
      console.error("[admin-login] mail", error);
    }
  }
  if (process.env.NODE_ENV !== "production") {
    console.log(`[admin-login] dev code for ${user.username}: ${code}`);
    channels.push("console");
  }

  if (channels.length === 0) {
    await db.adminLoginChallenge.delete({ where: { id } }).catch(() => {});
    return {
      id,
      delivery: {
        ok: false,
        error:
          "Không gửi được mã xác thực admin: cần Telegram (bot và chat) hoặc SMTP cùng email đã xác minh trong Cấu hình.",
      },
    };
  }
  return { id, delivery: { ok: true, channels } };
}

export type AdminVerifyResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; error: string };

/** The code typed back. Right, and the challenge is spent; wrong, and it costs a try. */
export async function verifyAdminChallenge(id: string, code: string): Promise<AdminVerifyResult> {
  const row = await db.adminLoginChallenge.findUnique({ where: { id } });
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 400, error: "Mã đã hết hạn. Đăng nhập lại để nhận mã mới." };
  }
  if (row.attempts >= ADMIN_CODE_MAX_ATTEMPTS) {
    return {
      ok: false,
      status: 429,
      error: "Nhập sai quá nhiều lần. Đăng nhập lại để nhận mã mới.",
    };
  }
  if (!sameHash(row.codeHash, challengeHash(id, code))) {
    await db.adminLoginChallenge.update({ where: { id }, data: { attempts: { increment: 1 } } });
    const left = ADMIN_CODE_MAX_ATTEMPTS - row.attempts - 1;
    return {
      ok: false,
      status: 400,
      error:
        left > 0
          ? `Mã không đúng (còn ${left} lần thử).`
          : "Nhập sai quá nhiều lần. Đăng nhập lại để nhận mã mới.",
    };
  }
  await db.adminLoginChallenge.deleteMany({ where: { userId: row.userId } });
  return { ok: true, userId: row.userId };
}
