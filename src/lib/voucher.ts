/**
 * What a voucher is worth on one order.
 *
 * Pure, so the buy endpoint and the "Áp dụng" preview cannot drift apart —
 * a preview that promises a discount the checkout then refuses is worse than
 * no preview at all. No database import, so the rules can be tested directly.
 */
export interface VoucherRules {
  percentOff: number | null;
  amountOff: bigint | null;
  minOrder: bigint | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
}

export type VoucherResult =
  | { ok: true; cut: bigint; total: bigint }
  | { ok: false; error: string };

export function evaluateVoucher(
  voucher: VoucherRules | null,
  unitPrice: bigint,
  now = new Date(),
): VoucherResult {
  if (!voucher || !voucher.active) {
    return { ok: false, error: "Mã giảm giá không tồn tại hoặc đã tắt" };
  }
  // A code can be created ahead of a campaign; null means live now.
  if (voucher.startsAt && voucher.startsAt.getTime() > now.getTime()) {
    return { ok: false, error: "Mã giảm giá chưa tới ngày áp dụng" };
  }
  if (voucher.expiresAt && voucher.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, error: "Mã giảm giá đã hết hạn" };
  }
  if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) {
    return { ok: false, error: "Mã giảm giá đã hết lượt sử dụng" };
  }
  // Honoured here for the first time: the field existed and the checkout
  // ignored it, so a code meant for big orders applied to every order.
  if (voucher.minOrder !== null && unitPrice < voucher.minOrder) {
    return {
      ok: false,
      error: `Đơn phải từ ${voucher.minOrder.toLocaleString("vi-VN")}đ mới dùng được mã này`,
    };
  }

  let cut = voucher.percentOff
    ? (unitPrice * BigInt(voucher.percentOff)) / 100n
    : (voucher.amountOff ?? 0n);
  // Never let a code pay the customer: the most it can do is make the order
  // free.
  if (cut > unitPrice) cut = unitPrice;
  if (cut <= 0n) {
    return { ok: false, error: "Mã giảm giá không giảm được đồng nào" };
  }

  return { ok: true, cut, total: unitPrice - cut };
}
