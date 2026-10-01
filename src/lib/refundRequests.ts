/**
 * Refunds: their states, the two ways money goes back, and the figures.
 *
 * Since 01/10/2026 a buyer never asks for a refund themselves — they report
 * the order for warranty and follow the ticket, and the shop, when it cannot
 * fix the order, refunds it from the ticket ("khách không cần gửi yêu cầu hoàn
 * tiền mà tự tui chuyển nó sang case hoàn tiền"). Older buyer-made requests
 * keep their rows and their desk; every new refund is written as an approved
 * request by the warranty desk, so the refund list stays the one history.
 */

export type RefundStatus = "PENDING" | "APPROVED" | "REJECTED";

export const REFUND_STATUS: Record<
  RefundStatus,
  { label: string; tile: string; dot: string }
> = {
  PENDING: {
    label: "Chờ xử lý",
    tile: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-500",
  },
  APPROVED: {
    label: "Đã chấp nhận",
    tile: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dot: "bg-emerald-500",
  },
  REJECTED: {
    label: "Đã từ chối",
    tile: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    dot: "bg-rose-500",
  },
};

export type RefundMethod = "MANUAL" | "WALLET";

/** The owner's two options (01/10/2026): to the site account, or to a bank. */
export const REFUND_METHOD: Record<
  RefundMethod,
  { label: string; hint: string }
> = {
  WALLET: {
    label: "Hoàn qua tài khoản",
    hint: "Cộng thẳng vào số dư tài khoản của khách trên web, ghi luôn một dòng giao dịch.",
  },
  MANUAL: {
    label: "Hoàn qua ngân hàng",
    hint: "Khách nhập số tài khoản ở trang trạng thái; shop chuyển khoản rồi bấm xác nhận.",
  },
};

export const REFUND_METHOD_KEYS = Object.keys(REFUND_METHOD) as RefundMethod[];

/**
 * What the shop's published rate works out to on this order.
 *
 * A starting figure for the box, not a rule: the desk can settle for more or
 * for less, and the number that ends up stored is whatever it typed. Rounded
 * down to the đồng, because a refund is money and there are no fractions of
 * one.
 *
 * Null where the product promises no rate at all — there is nothing to
 * suggest, and a suggested zero would read as "we owe you nothing".
 */
export function promisedRefund(
  total: number,
  refundRate: number | null,
): number | null {
  if (typeof refundRate !== "number") return null;
  return Math.floor((total * refundRate) / 100);
}

/**
 * The refunded figure, or the sentence to show instead of accepting it.
 *
 * Capped at the order total: giving back more than was paid is not a refund,
 * it is a transfer, and the one time it happens by accident it will be because
 * somebody typed an extra zero.
 */
export function readRefundAmount(
  value: unknown,
  orderTotal: number,
): { ok: true; amount: number } | { ok: false; error: string } {
  const n = typeof value === "string" ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: "Số tiền hoàn phải là số nguyên." };
  }
  if (n <= 0) {
    return { ok: false, error: "Số tiền hoàn phải lớn hơn 0." };
  }
  if (n > orderTotal) {
    return {
      ok: false,
      error: `Không hoàn quá số tiền của đơn (${orderTotal.toLocaleString("vi-VN")}đ).`,
    };
  }
  return { ok: true, amount: n };
}

/**
 * The window the shop's refund policy names: a fault reported within three
 * days of the sale is the clear case for money back, and one a month later is
 * the thing wearing out. No longer a gate — the desk decides from the ticket —
 * but the warranty desk shows it beside every report, so the decision is made
 * knowing which side of the line the buyer reported on.
 */
export const REFUND_WINDOW_DAYS = 3;
const WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** The end of the window for an order bought at `purchasedAt`. */
export function refundDeadline(purchasedAt: Date): Date {
  return new Date(purchasedAt.getTime() + WINDOW_MS);
}

/**
 * Whether the window had closed by `now`.
 *
 * Exactly on the deadline still counts as inside it: a boundary that refuses
 * the millisecond it names is a boundary somebody will hit and not believe.
 */
export function refundWindowClosed(purchasedAt: Date, now: Date): boolean {
  return now.getTime() > refundDeadline(purchasedAt).getTime();
}
