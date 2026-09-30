/**
 * A buyer's request to have an order refunded.
 *
 * The rules here are the ones both the form and the route have to agree on:
 * what counts as a reason, which orders can be argued about at all, and when a
 * second request is allowed. Kept apart from both so the page cannot promise
 * something the route then refuses.
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

export const REFUND_METHOD: Record<
  RefundMethod,
  { label: string; hint: string }
> = {
  WALLET: {
    label: "Hoàn vào ví",
    hint: "Cộng thẳng vào số dư khách trên web, ghi luôn một dòng giao dịch.",
  },
  MANUAL: {
    label: "Chuyển tay",
    hint: "Shop tự chuyển ngoài web. Ở đây chỉ ghi nhận là đã đồng ý.",
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
 * Short enough to be lazy, long enough to be answerable. "loi" tells the shop
 * nothing it can act on; a sentence does.
 */
export const REASON_MIN = 20;
export const REASON_MAX = 1000;

export const REASON_TOO_SHORT = `Vui lòng mô tả rõ hơn — ít nhất ${REASON_MIN} ký tự.`;
export const REASON_TOO_LONG = `Lý do tối đa ${REASON_MAX} ký tự.`;

/** The trimmed reason, or the sentence to show instead of accepting it. */
export function readReason(
  value: unknown,
): { ok: true; reason: string } | { ok: false; error: string } {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < REASON_MIN) return { ok: false, error: REASON_TOO_SHORT };
  if (reason.length > REASON_MAX) return { ok: false, error: REASON_TOO_LONG };
  return { ok: true, reason };
}

/**
 * How long after paying a buyer may still ask.
 *
 * A window at all, because a tool that worked for a month and then got patched
 * is not a refund — it is the thing wearing out — and without a line the shop
 * is arguing that case forever. Three days is the shop's call; the number
 * lives here so the button, the page and the route cannot disagree about when
 * it has passed.
 */
export const REFUND_WINDOW_DAYS = 3;
const WINDOW_MS = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/** The last moment a request on this order is accepted. */
export function refundDeadline(purchasedAt: Date): Date {
  return new Date(purchasedAt.getTime() + WINDOW_MS);
}

/**
 * Whether the window has closed.
 *
 * Exactly on the deadline still counts as inside it: a boundary that refuses
 * the millisecond it names is a boundary somebody will hit and not believe.
 */
export function refundWindowClosed(purchasedAt: Date, now: Date): boolean {
  return now.getTime() > refundDeadline(purchasedAt).getTime();
}

/** One warranty report on the order, as far as refunds care. */
export interface WarrantyRound {
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
}

/**
 * Where the refund right stands, warranty first.
 *
 * The shop's order of things (30/09/2026): a buyer whose order is not working
 * reports it for warranty first and asks for the money back only after —
 * "bảo hành trước rồi hoàn trả sau". So a report sent inside the three days
 * after the sale is what opens refunds. While the shop is still working on it
 * the right is held, however long that takes: a buyer who reported in time
 * must not lose the refund to the shop's own pace. Once every report sent in
 * time is closed, the buyer has another three days from the last close.
 *
 * - "needs-warranty": no report in time yet; `sendBy` is the last moment one
 *   still opens refunds (three days from the sale).
 * - "held": a report sent in time is still open.
 * - "until": every report sent in time is closed; refunds end at `deadline`.
 */
export type RefundWindow =
  | { kind: "needs-warranty"; sendBy: Date }
  | { kind: "held" }
  | { kind: "until"; deadline: Date };

export function refundWindow(purchasedAt: Date, warranties: WarrantyRound[]): RefundWindow {
  const sendBy = refundDeadline(purchasedAt);
  const inTime = warranties.filter((w) => w.createdAt.getTime() <= sendBy.getTime());
  if (inTime.length === 0) return { kind: "needs-warranty", sendBy };
  if (inTime.some((w) => w.status !== "RESOLVED")) return { kind: "held" };
  // The admin route stamps resolvedAt on every close; createdAt only stands in
  // for a row closed before that column existed.
  const lastClose = Math.max(...inTime.map((w) => (w.resolvedAt ?? w.createdAt).getTime()));
  return { kind: "until", deadline: new Date(lastClose + WINDOW_MS) };
}

/** What a buyer who has not reported the order yet is told. */
export const REFUND_NEEDS_WARRANTY =
  "Gửi yêu cầu bảo hành trước — nếu shop không khắc phục được, bạn mới yêu cầu hoàn trả.";

/**
 * Whether this order can be asked about, and what to say when it cannot.
 *
 * Four refusals, and the order they are checked in is the order they make
 * sense in. An order that was never charged has nothing to give back, whatever
 * else is true of it. One already being argued about should not collect a
 * second opinion while the shop is still forming the first — and saying "quá
 * hạn" to somebody who asked in time and is waiting would be a lie. A review
 * is the buyer's word that the purchase was what they wanted, so an order
 * they have already rated is closed to refunds — the shop's rule. Only then
 * does the clock matter.
 *
 * A *decided* request is no bar: a rejection the buyer can answer is the whole
 * point of keeping the rounds separate.
 *
 * The clock is the warranty-first one (refundWindow): no report yet asks for
 * one while the three days last and says "quá hạn" after; a report the shop
 * is still working holds the right open; three days after the last close it
 * ends.
 */
export function refundBlockedReason({
  orderStatus,
  openRequest,
  reviewed,
  purchasedAt,
  warranties,
  now,
}: {
  orderStatus: string;
  openRequest: boolean;
  /** The buyer has already reviewed this order. */
  reviewed: boolean;
  purchasedAt: Date;
  /** Every warranty report on the order, open or closed. */
  warranties: WarrantyRound[];
  now: Date;
}): string | null {
  if (orderStatus !== "PAID") {
    return "Chỉ đơn đã thanh toán mới yêu cầu hoàn trả được.";
  }
  if (openRequest) {
    return "Đơn này đã có một yêu cầu đang chờ shop xử lý.";
  }
  if (reviewed) {
    return "Đơn này đã được đánh giá — sau khi đánh giá thì không yêu cầu hoàn trả được nữa.";
  }
  const window = refundWindow(purchasedAt, warranties);
  if (window.kind === "needs-warranty") {
    return now.getTime() > window.sendBy.getTime()
      ? `Đã quá ${REFUND_WINDOW_DAYS} ngày kể từ lúc mua — đơn này không còn yêu cầu hoàn trả được.`
      : REFUND_NEEDS_WARRANTY;
  }
  if (window.kind === "until" && now.getTime() > window.deadline.getTime()) {
    return `Đã quá ${REFUND_WINDOW_DAYS} ngày kể từ khi shop xử lý xong bảo hành — đơn này không còn yêu cầu hoàn trả được.`;
  }
  return null;
}
