import "server-only";

import { randomInt } from "node:crypto";

import { announceToUser } from "@/lib/announcementStore";
import {
  ACCOUNT_MAX,
  ACCOUNT_MIN,
  REFUND_BANKS,
  maskAccount,
  normaliseAccount,
  normaliseHolder,
} from "@/lib/bankRefund";
import { db } from "@/lib/db";
import { hashCode, sameHash } from "@/lib/emailOtp";
import { absoluteUrl } from "@/lib/seo";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";
import {
  NOTE_MAX,
  PHONE_OTP_COOLDOWN_SECONDS,
  PHONE_OTP_MAX_ATTEMPTS,
  PHONE_OTP_TTL_MINUTES,
  PHONE_OTPS_PER_HOUR,
  PHONE_PROOF_VALID_MS,
  VERIFY_TAB_HREF,
  readFacebookUrl,
  readName,
  readPhone,
  type VerificationRequestView,
  type VerificationStatus,
  type VerificationView,
} from "@/lib/verificationRules";
import {
  ZALO_STATE_KEY,
  readZaloBotState,
  settleZaloBotState,
  verifyMessage,
} from "@/lib/zaloShared";

/**
 * "Xác thực cấp 2" (the owner, 12/10/2026: "cần liên kết Facebook Zalo chính
 * chủ và số điện thoại có otp và duyệt bởi admin kèm tk ngân hàng khớp với
 * tk chuyển và tên fb"). The customer links Zalo through the bot first, proves
 * a phone by sending a code shown on the web TO the bot from that Zalo (the
 * owner, 15/10/2026: "cái đảo chiều đc đó"; the bot only looks the number up
 * to see it is that Zalo's, so the number and the Zalo are one person's),
 * types their Facebook and the bank account they pay from, and the shop
 * decides by hand beside the account's history. Approved, the account is
 * level 2 and may buy what is flagged verifiedOnly.
 *
 * Every refusal is a coded Error for the routes to word (verificationFailure).
 */

const REQUEST_SELECT = {
  id: true,
  status: true,
  facebookUrl: true,
  facebookName: true,
  phone: true,
  zaloName: true,
  bankName: true,
  bankAccount: true,
  accountHolder: true,
  note: true,
  createdAt: true,
  reviewedAt: true,
} as const;

function toRequestView(row: {
  id: string;
  status: VerificationStatus;
  facebookUrl: string;
  facebookName: string;
  phone: string;
  zaloName: string | null;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  note: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}): VerificationRequestView {
  return {
    id: row.id,
    status: row.status,
    facebookUrl: row.facebookUrl,
    facebookName: row.facebookName,
    phone: row.phone,
    zaloName: row.zaloName,
    bankName: row.bankName,
    bankAccountMasked: maskAccount(row.bankAccount),
    accountHolder: row.accountHolder,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
  };
}

/** Whether the shop's Zalo bot is signed in and listening right now. */
async function botOnline(): Promise<boolean> {
  const row = await db.setting.findUnique({ where: { key: ZALO_STATE_KEY } });
  const state = settleZaloBotState(readZaloBotState(row?.value));
  return state?.state === "online";
}

/** What Bảo mật › Xác thực cấp 2 draws for this account. */
export async function verificationView(
  userId: string,
): Promise<VerificationView> {
  const [account, latest, online] = await Promise.all([
    db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { verifiedAt: true, zaloId: true, zaloName: true },
    }),
    db.accountVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: REQUEST_SELECT,
    }),
    botOnline(),
  ]);
  return {
    level: account.verifiedAt ? 2 : 1,
    verifiedAt: account.verifiedAt?.toISOString() ?? null,
    request: latest ? toRequestView(latest) : null,
    zaloLinked: account.zaloId !== null,
    zaloName: account.zaloName,
    botOnline: online,
  };
}

/**
 * What the outbox row for a phone check says to anyone reading it. The bot
 * never sends a PHONE_OTP row's text (bot/zalo/main.ts); the row exists so
 * the bot looks the number up and records whether it is the linked Zalo's.
 */
const PHONE_CHECK_TEXT = "(kiểm tra số điện thoại, không gửi)";

/**
 * "Lấy mã": a six-digit code the customer SENDS to the shop's Zalo bot from
 * the linked Zalo (the owner, 15/10/2026: "cái đảo chiều đc đó"). The bot
 * only reads; it never messages a number first, which is what gets a
 * personal account locked. The number typed is still tied to that Zalo: an
 * outbox row asks the bot to look it up (a lookup, nothing sent) and record
 * whether it is the linked account's; confirmPhoneOtpFromZalo reads that
 * word when the code arrives. Throttled per account like the email code.
 */
export async function startPhoneOtp(
  userId: string,
  rawPhone: unknown,
): Promise<{
  id: string;
  phone: string;
  /** The code and the message to send, shown to the customer to copy. */
  code: string;
  message: string;
  expiresAt: string;
  retryAfter: number;
  ttlMinutes: number;
}> {
  const phone = readPhone(rawPhone);
  if (!phone) throw new Error("PHONE_INVALID");
  const account = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { zaloId: true, verifiedAt: true },
  });
  if (account.verifiedAt) throw new Error("ALREADY_VERIFIED");
  if (!account.zaloId) throw new Error("ZALO_NOT_LINKED");
  if (!(await botOnline())) throw new Error("BOT_OFFLINE");

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await db.phoneVerification.findMany({
    where: { userId, createdAt: { gte: hourAgo } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const since = recent[0]
    ? (Date.now() - recent[0].createdAt.getTime()) / 1000
    : Infinity;
  if (since < PHONE_OTP_COOLDOWN_SECONDS) {
    throw new Error(
      `COOLDOWN:${Math.ceil(PHONE_OTP_COOLDOWN_SECONDS - since)}`,
    );
  }
  if (recent.length >= PHONE_OTPS_PER_HOUR) throw new Error("TOO_MANY");
  // Codes past the hour that were never typed have nothing left to do; a
  // proved one stays, the form reads it for a while yet.
  await db.phoneVerification.deleteMany({
    where: { userId, createdAt: { lt: hourAgo }, consumedAt: null },
  });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const outbox = await db.zaloOutbox.create({
    data: {
      zaloId: account.zaloId,
      kind: "PHONE_OTP",
      phone,
      text: PHONE_CHECK_TEXT,
    },
    select: { id: true },
  });
  const row = await db.phoneVerification.create({
    data: {
      userId,
      phone,
      codeHash: hashCode(userId, phone, code),
      expiresAt: new Date(Date.now() + PHONE_OTP_TTL_MINUTES * 60 * 1000),
      outboxId: outbox.id,
    },
    select: { id: true, expiresAt: true },
  });
  return {
    id: row.id,
    phone,
    code,
    message: verifyMessage(code),
    expiresAt: row.expiresAt.toISOString(),
    retryAfter: PHONE_OTP_COOLDOWN_SECONDS,
    ttlMinutes: PHONE_OTP_TTL_MINUTES,
  };
}

export type PhoneOtpStatus = {
  /**
   * Waiting for the customer's message (and the bot's look at the number),
   * proved, refused (the number is not that Zalo's, the code ran out), or
   * gone.
   */
  state: "pending" | "verified" | "failed" | "missing";
  error: string | null;
};

/** Where the code stands, for the form that polls while the customer is on Zalo. */
export async function phoneOtpStatus(
  userId: string,
  id: string,
): Promise<PhoneOtpStatus> {
  const row = await db.phoneVerification.findFirst({
    where: { id, userId },
    select: { outboxId: true, expiresAt: true, consumedAt: true, attempts: true },
  });
  if (!row) return { state: "missing", error: null };
  if (row.consumedAt) return { state: "verified", error: null };
  const outbox = row.outboxId
    ? await db.zaloOutbox.findUnique({
        where: { id: row.outboxId },
        select: { status: true, lastError: true },
      })
    : null;
  if (!outbox) {
    return { state: "failed", error: "Chưa kiểm tra được số, bấm Lấy mã khác" };
  }
  if (outbox.status === "FAILED") {
    return {
      state: "failed",
      error: outbox.lastError ?? "Số này không phải số của Zalo đã liên kết",
    };
  }
  if (row.attempts >= PHONE_OTP_MAX_ATTEMPTS) {
    return { state: "failed", error: "Gửi sai mã quá nhiều lần, bấm Lấy mã khác" };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return { state: "failed", error: "Mã đã hết hạn, bấm Lấy mã khác" };
  }
  return { state: "pending", error: null };
}

/** What the shop answers on Zalo when a code arrives (worded in zaloShop.ts). */
export type ZaloPhoneProof =
  | { kind: "not_linked" }
  | { kind: "already_verified"; username: string }
  | { kind: "no_code"; username: string }
  | { kind: "too_many"; username: string }
  | { kind: "wrong"; left: number }
  /** Right code, but the bot has not looked the number up yet. */
  | { kind: "checking"; phone: string }
  | { kind: "refused"; phone: string; reason: string }
  | { kind: "proved"; phone: string; username: string };

/**
 * How long the shop waits for the bot's look at the number before asking the
 * customer to send the code again: the bot drains its outbox every few
 * seconds, and a customer who pastes the code the moment it shows can beat it.
 */
const PHONE_CHECK_WAIT_MS = 6_000;
const PHONE_CHECK_POLL_MS = 750;

/**
 * The code, sent to the bot: it counts only from the Zalo linked to the
 * account the code was issued to, while the code lives, and once the bot has
 * found the number typed on the web to be that same Zalo's. Then the number
 * is proved for a while (PHONE_PROOF_VALID_MS) and the form may be sent.
 */
export async function confirmPhoneOtpFromZalo(
  zaloId: string,
  code: string,
): Promise<ZaloPhoneProof> {
  const account = await db.user.findUnique({
    where: { zaloId },
    select: { id: true, username: true, verifiedAt: true },
  });
  if (!account) return { kind: "not_linked" };
  if (account.verifiedAt) {
    return { kind: "already_verified", username: account.username };
  }
  // Every live code, newest first: a customer who pressed "Lấy mã khác" and
  // then sent the earlier code is still right.
  const rows = await db.phoneVerification.findMany({
    where: {
      userId: account.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      phone: true,
      codeHash: true,
      attempts: true,
      outboxId: true,
    },
  });
  const latest = rows[0];
  if (!latest) return { kind: "no_code", username: account.username };
  if (latest.attempts >= PHONE_OTP_MAX_ATTEMPTS) {
    return { kind: "too_many", username: account.username };
  }
  const match = rows.find((row) =>
    sameHash(row.codeHash, hashCode(account.id, row.phone, code)),
  );
  if (!match) {
    await db.phoneVerification.update({
      where: { id: latest.id },
      data: { attempts: { increment: 1 } },
    });
    return { kind: "wrong", left: PHONE_OTP_MAX_ATTEMPTS - latest.attempts - 1 };
  }

  const deadline = Date.now() + PHONE_CHECK_WAIT_MS;
  for (;;) {
    const outbox = match.outboxId
      ? await db.zaloOutbox.findUnique({
          where: { id: match.outboxId },
          select: { status: true, lastError: true },
        })
      : null;
    if (!outbox) {
      return {
        kind: "refused",
        phone: match.phone,
        reason: "Chưa kiểm tra được số điện thoại",
      };
    }
    if (outbox.status === "SENT") break;
    if (outbox.status === "FAILED") {
      return {
        kind: "refused",
        phone: match.phone,
        reason:
          outbox.lastError ?? "Số này không phải số của Zalo đã liên kết",
      };
    }
    if (Date.now() >= deadline) return { kind: "checking", phone: match.phone };
    await new Promise((resolve) => setTimeout(resolve, PHONE_CHECK_POLL_MS));
  }
  await db.phoneVerification.update({
    where: { id: match.id },
    data: { consumedAt: new Date() },
  });
  return { kind: "proved", phone: match.phone, username: account.username };
}

/** The form sent: a bid for the shop to read. */
export async function submitVerification(
  userId: string,
  body: {
    facebookUrl?: unknown;
    facebookName?: unknown;
    phone?: unknown;
    bankName?: unknown;
    bankAccount?: unknown;
    accountHolder?: unknown;
  } | null,
): Promise<VerificationView> {
  const account = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      verifiedAt: true,
      zaloId: true,
      zaloName: true,
      username: true,
    },
  });
  if (account.verifiedAt) throw new Error("ALREADY_VERIFIED");
  if (!account.zaloId) throw new Error("ZALO_NOT_LINKED");
  const pending = await db.accountVerification.findFirst({
    where: { userId, status: "PENDING" },
    select: { id: true },
  });
  if (pending) throw new Error("PENDING_EXISTS");

  const facebookUrl = readFacebookUrl(body?.facebookUrl);
  if (!facebookUrl) throw new Error("FB_URL");
  const facebookName = readName(body?.facebookName);
  if (facebookName.length < 2) throw new Error("FB_NAME");
  const phone = readPhone(body?.phone);
  if (!phone) throw new Error("PHONE_INVALID");
  const proof = await db.phoneVerification.findFirst({
    where: {
      userId,
      phone,
      consumedAt: { gte: new Date(Date.now() - PHONE_PROOF_VALID_MS) },
    },
    orderBy: { consumedAt: "desc" },
    select: { consumedAt: true },
  });
  if (!proof?.consumedAt) throw new Error("PHONE_UNPROVED");

  const bankName =
    typeof body?.bankName === "string" ? body.bankName.trim() : "";
  if (!(REFUND_BANKS as readonly string[]).includes(bankName)) {
    throw new Error("BANK");
  }
  const bankAccount = normaliseAccount(body?.bankAccount);
  if (
    !/^\d+$/.test(bankAccount) ||
    bankAccount.length < ACCOUNT_MIN ||
    bankAccount.length > ACCOUNT_MAX
  ) {
    throw new Error("BANK_ACCOUNT");
  }
  const accountHolder = normaliseHolder(body?.accountHolder);
  if (!/^[A-Z ]{2,60}$/.test(accountHolder)) throw new Error("HOLDER");

  await db.accountVerification.create({
    data: {
      userId,
      facebookUrl,
      facebookName,
      phone,
      phoneVerifiedAt: proof.consumedAt,
      zaloId: account.zaloId,
      zaloName: account.zaloName,
      bankName,
      bankAccount,
      accountHolder,
    },
  });

  // The desk hears of it where it hears of everything else; never allowed to
  // fail the customer's form.
  await notifyTelegramAdmins(
    `🪪 <b>Hồ sơ xác thực cấp 2 mới</b>\n` +
      `${escapeTelegramHtml(account.username)} · ${phone}\n` +
      `Facebook: ${escapeTelegramHtml(facebookName)}\n` +
      absoluteUrl("/admin/verifications"),
  ).catch(() => undefined);

  return verificationView(userId);
}

export type VerificationDecision = "approve" | "reject" | "revoke";

/**
 * The shop's word: approve (the account becomes level 2), reject (with a
 * reason the customer reads), or revoke an approval already given. The
 * customer is told through the bell and their linked channels.
 */
export async function decideVerification(
  admin: { username: string },
  id: string,
  action: VerificationDecision,
  rawNote: unknown,
): Promise<{ status: VerificationStatus }> {
  const note = readName(rawNote).slice(0, NOTE_MAX);
  if (action !== "approve" && note.length < 3) throw new Error("NOTE_REQUIRED");
  const row = await db.accountVerification.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!row) throw new Error("NOT_FOUND");
  if (
    action === "revoke" ? row.status !== "APPROVED" : row.status !== "PENDING"
  ) {
    throw new Error("NOT_PENDING");
  }

  const now = new Date();
  const status: VerificationStatus =
    action === "approve" ? "APPROVED" : "REJECTED";
  await db.$transaction([
    db.accountVerification.update({
      where: { id },
      data: {
        status,
        note: note || null,
        reviewedAt: now,
        reviewedBy: admin.username,
      },
    }),
    db.user.update({
      where: { id: row.userId },
      data: { verifiedAt: action === "approve" ? now : null },
    }),
  ]);

  await announceToUser(
    row.userId,
    action === "approve"
      ? {
          title: "Tài khoản đã được xác thực cấp 2",
          body: "Shop đã duyệt hồ sơ của bạn. Từ giờ bạn thuê được cả những bản hack chỉ dành cho tài khoản xác thực.",
          type: "INFO",
          cta: { label: "Xem", href: VERIFY_TAB_HREF },
        }
      : action === "reject"
        ? {
            title: "Hồ sơ xác thực cấp 2 chưa được duyệt",
            body: `Lý do: ${note}. Bạn sửa lại hồ sơ rồi gửi lại ở Bảo mật → Xác thực cấp 2.`,
            type: "INFO",
            cta: { label: "Gửi lại", href: VERIFY_TAB_HREF },
          }
        : {
            title: "Xác thực cấp 2 đã bị thu hồi",
            body: `Lý do: ${note}. Tài khoản về cấp 1; bạn có thể gửi hồ sơ lại ở Bảo mật → Xác thực cấp 2.`,
            type: "INFO",
            cta: { label: "Xem", href: VERIFY_TAB_HREF },
          },
  );
  return { status };
}

/** One bid as the desk lists it, with what helps the shop decide. */
export type AdminVerificationRow = {
  id: string;
  status: VerificationStatus;
  username: string;
  uid: number;
  joinedAt: string;
  facebookUrl: string;
  facebookName: string;
  phone: string;
  phoneVerifiedAt: string;
  /** The Zalo name snapshotted with the bid, and the one linked now. */
  zaloName: string | null;
  zaloNow: string | null;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  note: string | null;
  createdAt: string;
  createdTs: number;
  reviewedAt: string | null;
  reviewedBy: string | null;
  /** Bank top-ups that went through, for the "khớp với tk chuyển" check. */
  topUps: number;
  topUpTotal: number;
};

function stamp(date: Date): string {
  return date.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The desk's list: newest first, the page sorts the waiting ones up. */
export async function adminVerificationRows(): Promise<AdminVerificationRow[]> {
  const rows = await db.accountVerification.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      ...REQUEST_SELECT,
      phoneVerifiedAt: true,
      reviewedBy: true,
      user: {
        select: {
          id: true,
          username: true,
          uid: true,
          createdAt: true,
          zaloName: true,
        },
      },
    },
  });
  const userIds = [...new Set(rows.map((r) => r.user.id))];
  const paid = userIds.length
    ? await db.topUp.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, method: "BANK", status: "COMPLETED" },
        _count: { _all: true },
        _sum: { amount: true },
      })
    : [];
  const paidBy = new Map(
    paid.map((p) => [
      p.userId,
      { count: p._count._all, total: Number(p._sum.amount ?? 0) },
    ]),
  );
  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    username: r.user.username,
    uid: r.user.uid,
    joinedAt: stamp(r.user.createdAt),
    facebookUrl: r.facebookUrl,
    facebookName: r.facebookName,
    phone: r.phone,
    phoneVerifiedAt: stamp(r.phoneVerifiedAt),
    zaloName: r.zaloName,
    zaloNow: r.user.zaloName,
    bankName: r.bankName,
    bankAccount: r.bankAccount,
    accountHolder: r.accountHolder,
    note: r.note,
    createdAt: stamp(r.createdAt),
    createdTs: r.createdAt.getTime(),
    reviewedAt: r.reviewedAt ? stamp(r.reviewedAt) : null,
    reviewedBy: r.reviewedBy,
    topUps: paidBy.get(r.user.id)?.count ?? 0,
    topUpTotal: paidBy.get(r.user.id)?.total ?? 0,
  }));
}

/** The route's words and status for a coded refusal. */
export function verificationFailure(error: unknown): {
  error: string;
  status: number;
} {
  const message = error instanceof Error ? error.message : String(error);
  switch (message) {
    case "PHONE_INVALID":
      return {
        error: "Số điện thoại chưa đúng, nhập 10 số bắt đầu bằng 0.",
        status: 400,
      };
    case "ALREADY_VERIFIED":
      return { error: "Tài khoản đã ở cấp 2 rồi.", status: 400 };
    case "ZALO_NOT_LINKED":
      return {
        error:
          "Liên kết Zalo ở mục Liên kết nền tảng trước, số điện thoại được xác minh qua Zalo đó.",
        status: 400,
      };
    case "BOT_OFFLINE":
      return {
        error:
          "Kênh Zalo của shop đang bảo trì nên chưa xác minh số được. Thử lại sau hoặc nhắn shop.",
        status: 503,
      };
    case "TOO_MANY":
      return {
        error: "Bạn đã lấy mã quá nhiều lần. Thử lại sau 1 giờ.",
        status: 429,
      };
    case "PENDING_EXISTS":
      return { error: "Hồ sơ của bạn đang chờ shop duyệt.", status: 409 };
    case "FB_URL":
      return {
        error: "Dán link trang cá nhân Facebook của bạn (facebook.com/…).",
        status: 400,
      };
    case "FB_NAME":
      return { error: "Nhập tên hiển thị trên Facebook.", status: 400 };
    case "PHONE_UNPROVED":
      return {
        error: "Xác minh số điện thoại qua Zalo trước khi gửi hồ sơ.",
        status: 400,
      };
    case "BANK":
      return { error: "Chọn ngân hàng của bạn.", status: 400 };
    case "BANK_ACCOUNT":
      return {
        error: `Số tài khoản chỉ gồm ${ACCOUNT_MIN}–${ACCOUNT_MAX} chữ số.`,
        status: 400,
      };
    case "HOLDER":
      return {
        error: "Nhập tên chủ tài khoản như trên thẻ ngân hàng.",
        status: 400,
      };
    case "NOT_FOUND":
      return { error: "Không thấy hồ sơ này.", status: 404 };
    case "NOT_PENDING":
      return { error: "Hồ sơ này đã được xử lý rồi.", status: 409 };
    case "NOTE_REQUIRED":
      return { error: "Ghi lý do cho khách (ít nhất 3 ký tự).", status: 400 };
    default:
      break;
  }
  if (message.startsWith("COOLDOWN:")) {
    return {
      error: `Vui lòng đợi ${message.slice(9)} giây rồi lấy mã khác.`,
      status: 429,
    };
  }
  console.error("verification failed", error);
  return { error: "Có lỗi, thử lại sau.", status: 500 };
}
