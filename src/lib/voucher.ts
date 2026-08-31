/**
 * What a voucher is worth on one order.
 *
 * Pure, so the buy endpoint and the "Áp dụng" preview cannot drift apart —
 * a preview that promises a discount the checkout then refuses is worse than
 * no preview at all. No database import, so the rules can be tested directly.
 */
export type VoucherScope = "ALL" | "CATEGORY" | "PRODUCT";

/** The product a code is being tried on, for the scope check. */
export interface VoucherTarget {
  productId: string;
  categoryId: string;
}

export interface VoucherRules {
  /** What the code may be spent on; ALL needs no target at all. */
  scope: VoucherScope;
  categoryId: string | null;
  /** The products a PRODUCT code names; an empty list matches nothing. */
  productIds: string[];
  percentOff: number | null;
  amountOff: bigint | null;
  minOrder: bigint | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
}

/**
 * A voucher row read with its product links, as the rules see it. Null in,
 * null out, so a lookup miss flows straight into `evaluateVoucher`.
 */
export function voucherRules<T extends Omit<VoucherRules, "productIds">>(
  row: (T & { products: { productId: string }[] }) | null,
): VoucherRules | null {
  return row ? { ...row, productIds: row.products.map((link) => link.productId) } : null;
}

export type VoucherResult =
  | { ok: true; cut: bigint; total: bigint }
  | { ok: false; error: string };

export function evaluateVoucher(
  voucher: VoucherRules | null,
  unitPrice: bigint,
  now = new Date(),
  target?: VoucherTarget,
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
  // Scope. A code whose named products are all gone, or whose category link
  // was nulled on delete, matches nothing — which is the honest answer.
  if (voucher.scope === "PRODUCT") {
    if (!target || !voucher.productIds.includes(target.productId)) {
      return { ok: false, error: "Mã giảm giá này chỉ dùng được cho những sản phẩm chỉ định" };
    }
  } else if (voucher.scope === "CATEGORY") {
    if (!voucher.categoryId || !target || target.categoryId !== voucher.categoryId) {
      return { ok: false, error: "Mã giảm giá này chỉ dùng được cho danh mục khác" };
    }
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

/** One basket line, as the voucher rules need to see it. */
export interface VoucherLine extends VoucherTarget {
  /** What this line is worth after any member or agency cut. */
  amount: bigint;
}

/**
 * What a code is worth on a whole basket.
 *
 * A scoped code discounts the lines it covers and leaves the rest alone —
 * anything else would be a lie in one direction or the other: charging the
 * percentage against the whole basket would hand out a discount on products
 * the code was never meant for, and refusing the basket outright would tell a
 * customer holding one eligible tool that their code does not work.
 *
 * The minimum-spend test is applied to the eligible part for the same reason:
 * "đơn từ 500k" on a Valorant-only code means 500k of Valorant.
 */
export function evaluateVoucherForCart(
  voucher: VoucherRules | null,
  lines: VoucherLine[],
  now = new Date(),
): VoucherResult {
  const total = lines.reduce((sum, line) => sum + line.amount, 0n);
  if (!voucher) return evaluateVoucher(voucher, total, now);

  const eligible =
    voucher.scope === "ALL"
      ? lines
      : lines.filter((line) =>
          voucher.scope === "PRODUCT"
            ? voucher.productIds.includes(line.productId)
            : line.categoryId === voucher.categoryId,
        );

  if (eligible.length === 0) {
    // Let the single-line path phrase it: it already knows how to say which
    // kind of code this is, and one message for both keeps them in step.
    return evaluateVoucher(voucher, total, now, lines[0]);
  }

  const base = eligible.reduce((sum, line) => sum + line.amount, 0n);
  const applied = evaluateVoucher(voucher, base, now, eligible[0]);
  if (!applied.ok) return applied;

  // The cut came off the eligible part; what is left to pay is the whole
  // basket minus that.
  return { ok: true, cut: applied.cut, total: total - applied.cut };
}
