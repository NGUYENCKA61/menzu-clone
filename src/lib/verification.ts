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
import { getShopSettings } from "@/lib/settingsStore";
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
} from "@/lib/zaloShared";

/**
 * "Xác thực cấp 2" (the owner, 12/10/2026: "cần liên kết Facebook Zalo chính
 * chủ và số điện thoại có otp và duyệt bởi admin kèm tk ngân hàng khớp với
 * tk chuyển và tên fb"). The customer links Zalo through the bot first, proves
 * a phone with a code the bot sends to that number's own Zalo (so the number
 * and the Zalo are one person's), types their Facebook and the bank account
 * they pay from, and the shop decides by hand beside the account's history.
 * Approved, the account is level 2 and may buy what is flagged verifiedOnly.
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
 * "Gửi mã qua Zalo": a six-digit code queued for the bot, which looks the
 * number up on Zalo, checks it is the linked account's, and only then sends
 * it (bot/zalo/main.ts). Throttled per account like the email code.
 */
export async function startPhoneOtp(
  userId: string,
  rawPhone: unknown,
): Promise<{
  id: string;
  phone: string;
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

  const settings = await getShopSettings();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const outbox = await db.zaloOutbox.create({
    data: {
      zaloId: account.zaloId,
      kind: "PHONE_OTP",
      phone,
      text:
        `${settings.brandName}: mã xác thực số điện thoại của bạn là ${code}. ` +
        `Mã dùng trong ${PHONE_OTP_TTL_MINUTES} phút, nhập ở Bảo mật → Xác thực cấp 2. ` +
        "Không đưa mã này cho ai.",
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
    select: { id: true },
  });
  return {
    id: row.id,
    phone,
    retryAfter: PHONE_OTP_COOLDOWN_SECONDS,
    ttlMinutes: PHONE_OTP_TTL_MINUTES,
  };
}

export type PhoneOtpStatus = {
  state: "pending" | "sent" | "failed" | "missing";
  error: string | null;
};

/** Where the code stands, for the form that waits on the bot. */
export async function phoneOtpStatus(
  userId: string,
  id: string,
): Promise<PhoneOtpStatus> {
  const row = await db.phoneVerification.findFirst({
    where: { id, userId },
    select: { outboxId: true, expiresAt: true, consumedAt: true },
  });
  if (!row) return { state: "missing", error: null };
  if (row.consumedAt) return { state: "sent", error: null };
  const outbox = row.outboxId
    ? await db.zaloOutbox.findUnique({
        where: { id: row.outboxId },
        select: { status: true, lastError: true },
      })
    : null;
  if (!outbox) return { state: "failed", error: "Chưa gửi được mã" };
  if (outbox.status === "SENT") return { state: "sent", error: null };
  if (outbox.status === "FAILED") {
    return { state: "failed", error: outbox.lastError ?? "Chưa gửi được mã" };
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return {
      state: "failed",
      error: "Mã hết hạn trước khi gửi được, bấm Gửi mã lại",
    };
  }
  return { state: "pending", error: null };
}

/** The code typed back: right, and the number counts as proved for a while. */
export async function confirmPhoneOtp(
  userId: string,
  rawCode: unknown,
): Promise<{ phone: string }> {
  const code = String(rawCode ?? "").replace(/\D/g, "");
  if (code.length !== 6) throw new Error("CODE_SHAPE");
  const row = await db.phoneVerification.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!row || row.expiresAt.getTime() <= Date.now()) throw new Error("NO_CODE");
  if (row.attempts >= PHONE_OTP_MAX_ATTEMPTS) throw new Error("TOO_MANY_TRIES");
  const outbox = row.outboxId
    ? await db.zaloOutbox.findUnique({
        where: { id: row.outboxId },
        select: { status: true, lastError: true },
      })
    : null;
  if (outbox?.status !== "SENT") {
    throw new Error(
      `NOT_SENT:${outbox?.status === "FAILED" ? (outbox.lastError ?? "") : ""}`,
    );
  }
  if (!sameHash(row.codeHash, hashCode(userId, row.phone, code))) {
    await db.phoneVerification.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error(`WRONG:${PHONE_OTP_MAX_ATTEMPTS - row.attempts - 1}`);
  }
  await db.phoneVerification.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return { phone: row.phone };
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
          "Liên kết Zalo ở mục Liên kết nền tảng trước, mã xác thực gửi qua Zalo.",
        status: 400,
      };
    case "BOT_OFFLINE":
      return {
        error:
          "Bot Zalo của shop đang không chạy nên chưa gửi mã được. Thử lại sau hoặc nhắn shop.",
        status: 503,
      };
    case "TOO_MANY":
      return {
        error: "Bạn đã gửi mã quá nhiều lần. Thử lại sau 1 giờ.",
        status: 429,
      };
    case "CODE_SHAPE":
      return { error: "Nhập đủ 6 số của mã xác thực.", status: 400 };
    case "NO_CODE":
      return {
        error: "Mã đã hết hạn hoặc chưa gửi. Bấm Gửi mã lại.",
        status: 400,
      };
    case "TOO_MANY_TRIES":
      return {
        error: "Nhập sai quá nhiều lần. Hãy gửi lại mã mới.",
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
        error: "Xác minh số điện thoại bằng mã Zalo trước khi gửi hồ sơ.",
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
      error: `Vui lòng đợi ${message.slice(9)} giây rồi gửi lại mã.`,
      status: 429,
    };
  }
  if (message.startsWith("NOT_SENT:")) {
    const reason = message.slice(9);
    return {
      error: reason
        ? `Chưa gửi được mã: ${reason}. Kiểm tra số rồi bấm Gửi mã lại.`
        : "Mã đang trên đường tới Zalo của bạn, chờ thêm chút rồi nhập.",
      status: 409,
    };
  }
  if (message.startsWith("WRONG:")) {
    const left = Number(message.slice(6));
    return {
      error:
        left > 0
          ? `Mã không đúng (còn ${left} lần thử).`
          : "Nhập sai quá nhiều lần. Hãy gửi lại mã mới.",
      status: 400,
    };
  }
  console.error("verification failed", error);
  return { error: "Có lỗi, thử lại sau.", status: 500 };
}
