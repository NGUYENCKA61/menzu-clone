/**
 * Buying something, wherever the buyer is standing.
 *
 * The web checkout and the Telegram shop bot sell the same shelf out of the
 * same wallet, so the sale is one function rather than two copies that would
 * drift: the product row is locked, the price is worked out with every
 * discount the buyer is owed, the wallet is debited, the order is written and
 * the keys are handed over, all inside one transaction. A failure is thrown as
 * a short coded message; `checkoutFailure` turns that into words and an HTTP
 * status, so the API route and the bot say the same thing about the same
 * refusal.
 */
import {
  deliversAutomatically,
  readLogin,
  tagOf,
} from "@/lib/accountLogin";
import { agencyCutFor, clampAgencyPercent } from "@/lib/agency";
import { db } from "@/lib/db";
import { deliverKeys } from "@/lib/licenseKeys";
import { readMemberTier, TIER_RULES, tierDiscountFor } from "@/lib/memberTiers";
import { getShopSettings } from "@/lib/settingsStore";
import { makeShortCode } from "@/lib/shortCode";
import { isSalesLocked, salesLockReason } from "@/lib/softwareStatus";
import { evaluateVoucher, voucherRules } from "@/lib/voucher";
import { balanceOf, debitWallet } from "@/lib/wallet";

/** Short human-facing code, e.g. DH8F3K2Q. */
const makeCode = makeShortCode;

export interface CheckoutInput {
  userId: string;
  /** The product's stock code. */
  code: string;
  /** Required for a tool; ignored for an account. */
  packageId?: string | null;
  /** Keys for a tool, sign-ins for a random listing; one for anything else. */
  quantity?: number;
  voucher?: string | null;
}

export interface CheckoutResult {
  orderId: string;
  orderCode: string;
  total: bigint;
  balanceAfter: bigint;
  tierCut: bigint;
  delivered: number;
  quantity: number;
  isSoftware: boolean;
  isPool: boolean;
  /** A plain account whose sign-in is handed over the moment it is paid. */
  loginReady: boolean;
  productName: string;
  packageLabel: string | null;
}

/**
 * The sale itself. The live checkout debits a wallet balance — there is no
 * card step — so this runs as one interactive transaction. Every read that a
 * later write depends on happens inside it, and the product row is locked
 * before the sale so two concurrent buyers cannot both take the same account.
 *
 * Throws an Error whose message is one of the codes `checkoutFailure` reads.
 */
export async function placeOrder(input: CheckoutInput): Promise<CheckoutResult> {
  const settings = await getShopSettings();
  if (!settings.purchasesEnabled) throw new Error(`CLOSED:${settings.closedMessage}`);

  const code = input.code.trim();
  if (!code) throw new Error("NOT_FOUND");
  const voucherCode = input.voucher?.trim() || null;

  return db.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<
      { id: string; status: string; productType: string; softwareStatus: string | null }[]
    >`
      SELECT id, status, "productType", "softwareStatus" FROM products
      WHERE code = ${code} AND "deletedAt" IS NULL
      FOR UPDATE
    `;
    if (locked.length === 0) throw new Error("NOT_FOUND");
    if (locked[0].status !== "AVAILABLE") {
      throw new Error(locked[0].productType === "SOFTWARE_GAME" ? "OFF_SHELF" : "ALREADY_SOLD");
    }
    if (locked[0].productType === "SOFTWARE_GAME" && isSalesLocked(locked[0].softwareStatus)) {
      throw new Error(`LOCKED:${locked[0].softwareStatus}`);
    }

    const product = await tx.product.findUniqueOrThrow({
      where: { code },
      include: { tags: { select: { label: true }, take: 1 } },
    });
    const now = new Date();
    const sale = await tx.flashSale.findFirst({
      where: {
        productId: product.id,
        active: true,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      orderBy: { salePrice: "asc" },
      select: { salePrice: true },
    });

    const isSoftware = product.productType === "SOFTWARE_GAME";
    // A random listing sells sign-ins by the piece off its one package; the
    // package is the shelf the pairs sit on.
    const isPool = !isSoftware && product.accountPool;
    const poolPackage = isPool
      ? await tx.productPackage.findFirst({
          where: { productId: product.id },
          orderBy: { sortOrder: "asc" },
          select: { id: true },
        })
      : null;
    if (isPool && !poolPackage) throw new Error("OUT_OF_ACC:0");

    let chosenPackage: {
      id: string;
      price: bigint;
      label: string;
      durationHours: number | null;
    } | null = null;
    if (isSoftware) {
      const wanted = input.packageId?.trim();
      if (!wanted) throw new Error("PACKAGE_REQUIRED");
      const found = await tx.productPackage.findFirst({
        where: { id: wanted, productId: product.id },
        select: { id: true, price: true, label: true, durationHours: true },
      });
      if (!found) throw new Error("BAD_PACKAGE");
      chosenPackage = found;
    }

    const asked = Math.floor(Number(input.quantity ?? 1)) || 1;
    const quantity = isSoftware
      ? Math.min(99, Math.max(1, asked))
      : isPool
        ? Math.min(999, Math.max(1, asked))
        : 1;

    const unitPrice = chosenPackage ? chosenPackage.price : (sale?.salePrice ?? product.price);
    const lineTotal = unitPrice * BigInt(quantity);

    // Re-read the buyer inside the transaction — for the balance below, and
    // for the role and tier the discounts hang on.
    const buyer = await tx.user.findUniqueOrThrow({ where: { id: input.userId } });
    const agencyPct =
      buyer.role === "AGENCY" && isSoftware ? clampAgencyPercent(buyer.agencyPercent) : 0;
    const agencyCut = agencyPct > 0 ? agencyCutFor(lineTotal, agencyPct) : 0n;
    const memberTier = readMemberTier(buyer.tier);
    const tierPct = isSoftware && agencyPct === 0 ? TIER_RULES[memberTier].discountPercent : 0;
    const tierCut = tierPct > 0 ? tierDiscountFor(lineTotal, memberTier) : 0n;

    let voucherId: string | null = null;
    let voucherCut = 0n;
    if (voucherCode && agencyPct === 0) {
      const v = await tx.voucher.findUnique({
        where: { code: voucherCode },
        include: { products: { select: { productId: true } } },
      });
      const applied = evaluateVoucher(voucherRules(v), lineTotal - tierCut, now, {
        productId: product.id,
        categoryId: product.categoryId,
      });
      if (!v || !applied.ok) throw new Error("BAD_VOUCHER");
      voucherId = v.id;
      voucherCut = applied.cut;
      const bumped = await tx.voucher.updateMany({
        where: {
          id: v.id,
          ...(v.maxUses !== null ? { usedCount: { lt: v.maxUses } } : {}),
        },
        data: { usedCount: { increment: 1 } },
      });
      if (bumped.count === 0) throw new Error("BAD_VOUCHER");
    }

    const total = lineTotal - agencyCut - tierCut - voucherCut;
    // One debit, checked against the balance in the same statement: a second
    // read-then-write would let two purchases both see the same balance and
    // the second write would erase the first debit.
    const balanceAfter = await debitWallet(tx, input.userId, total);
    if (balanceAfter === null) {
      throw new Error(`INSUFFICIENT:${total - (await balanceOf(tx, input.userId))}`);
    }

    await tx.product.update({
      where: { id: product.id },
      data: {
        ...(isSoftware || isPool ? {} : { status: "SOLD" as const }),
        soldCount: { increment: quantity },
      },
    });

    const listPrice = isSoftware ? lineTotal : product.oldPrice * BigInt(quantity);
    const discountPct =
      agencyPct > 0
        ? agencyPct
        : tierPct > 0
          ? tierPct
          : !isSoftware && product.oldPrice > 0n
            ? Number(((product.oldPrice - unitPrice) * 100n) / product.oldPrice)
            : 0;

    const order = await tx.order.create({
      data: {
        code: makeCode("DH"),
        userId: input.userId,
        productId: product.id,
        packageId: chosenPackage?.id ?? poolPackage?.id ?? null,
        quantity,
        keysOwed: isSoftware || isPool ? quantity : 0,
        method: "BUY_NOW",
        status: "PAID",
        listPrice,
        discountPct,
        voucherId,
        voucherCut,
        total,
      },
    });

    const shelf = chosenPackage?.id ?? poolPackage?.id ?? null;
    const delivered = shelf
      ? await deliverKeys(tx, {
          packageId: shelf,
          orderId: order.id,
          userId: input.userId,
          wanted: quantity,
          durationHours: chosenPackage?.durationHours ?? null,
        })
      : 0;
    if (shelf && delivered < quantity) {
      throw new Error(`${isPool ? "OUT_OF_ACC" : "OUT_OF_KEYS"}:${delivered}`);
    }

    await tx.transaction.create({
      data: {
        code: makeCode("GD"),
        userId: input.userId,
        kind: "PURCHASE",
        status: "SUCCESS",
        delta: -total,
        balanceAfter,
        description: chosenPackage
          ? `Mua ${product.name ?? product.code} — ${chosenPackage.label}${
              quantity > 1 ? ` ×${quantity}` : ""
            }${
              agencyPct > 0
                ? " · giá đại lý"
                : tierCut > 0n
                  ? ` · ưu đãi hạng ${TIER_RULES[memberTier].label}`
                  : ""
            }`
          : isPool
            ? `Mua ${quantity} tài khoản ${product.name ?? product.code}`
            : `Mua tài khoản #${product.code}`,
        method: "Ví Menzu",
      },
    });

    return {
      orderId: order.id,
      orderCode: order.code,
      total,
      balanceAfter,
      tierCut,
      delivered,
      quantity,
      isSoftware,
      isPool,
      loginReady: deliversAutomatically(tagOf(product)) && readLogin(product) !== null,
      productName: product.name ?? product.code,
      packageLabel: chosenPackage?.label ?? null,
    };
  });
}

export interface CheckoutFailure {
  status: number;
  error: string;
  /** How much more the wallet needs, when that is the refusal. */
  shortfall?: number;
  /** How many keys or sign-ins are actually on the shelf, when that is. */
  available?: number;
}

/** The refusal in words, for whoever was buying. */
export function checkoutFailure(error: unknown): CheckoutFailure {
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("CLOSED:")) return { status: 503, error: message.slice(7) };
  if (message === "NOT_FOUND") return { status: 404, error: "Không tìm thấy tài khoản" };
  if (message === "ALREADY_SOLD") return { status: 409, error: "Tài khoản đã được bán" };
  if (message === "OFF_SHELF") {
    return { status: 409, error: "Sản phẩm này đang tạm ngừng bán" };
  }
  if (message.startsWith("LOCKED:")) {
    return {
      status: 409,
      error: `Tool này ${salesLockReason(message.slice(7))} — shop tạm khóa mua key cho đến khi có bản an toàn`,
    };
  }
  if (message === "PACKAGE_REQUIRED") return { status: 400, error: "Hãy chọn gói trước khi mua" };
  if (message === "BAD_PACKAGE") {
    return { status: 409, error: "Gói này không còn bán, hãy chọn lại" };
  }
  if (message.startsWith("OUT_OF_KEYS:")) {
    const available = Number(message.slice("OUT_OF_KEYS:".length));
    return {
      status: 409,
      error:
        available > 0
          ? `Số lượng trên hệ thống không đủ — gói này chỉ còn ${available} key.`
          : "Số lượng trên hệ thống không đủ — gói này đã hết key.",
      available,
    };
  }
  if (message.startsWith("OUT_OF_ACC:")) {
    const available = Number(message.slice("OUT_OF_ACC:".length));
    return {
      status: 409,
      error:
        available > 0
          ? `Kho chỉ còn ${available} tài khoản — giảm số lượng rồi thử lại.`
          : "Kho tài khoản này vừa hết, shop sẽ nhập thêm sớm.",
      available,
    };
  }
  if (message === "BAD_VOUCHER") {
    return { status: 400, error: "Mã giảm giá không hợp lệ hoặc đã hết hạn" };
  }
  if (message.startsWith("INSUFFICIENT:")) {
    return {
      status: 402,
      error: "Số dư không đủ",
      shortfall: Number(message.slice("INSUFFICIENT:".length)),
    };
  }
  console.error("order failed", error);
  return { status: 500, error: "Không thể tạo đơn hàng" };
}
