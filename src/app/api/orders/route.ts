import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { evaluateVoucher } from "@/lib/voucher";

/** Short human-facing code, e.g. DH8F3K2Q. */
function makeCode(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${rand}`;
}

/**
 * Buy an account.
 *
 * The live checkout debits a wallet balance — there is no card step — so this
 * runs as one interactive transaction. Every read that a later write depends on
 * happens inside it, and the product row is locked before the sale so two
 * concurrent buyers cannot both take the same account.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để mua tài khoản" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    voucher?: string;
    /** Software only — which duration was chosen. */
    packageId?: string;
    /** Software only. Accounts are one of a kind and ignore it. */
    quantity?: number;
  } | null;

  const code = body?.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Thiếu mã tài khoản" }, { status: 400 });
  }

  // Checked before the transaction opens: a sale that is switched off should
  // cost the database nothing, and refusing here means no row is ever locked.
  const settings = await getShopSettings();
  if (!settings.purchasesEnabled) {
    return NextResponse.json({ error: settings.closedMessage }, { status: 503 });
  }
  const voucherCode = body?.voucher?.trim() || null;

  try {
    const result = await db.$transaction(async (tx) => {
      // Lock this product row for the duration of the transaction. Without
      // this, two buyers can both read AVAILABLE and both be charged.
      // The removed check rides on this same locked read rather than sitting
      // in a query of its own: a product taken down between the page render
      // and this transaction has to read as gone, and any second look would be
      // outside the lock. Quoted because Prisma leaves the column camelCased.
      const locked = await tx.$queryRaw<{ id: string; status: string }[]>`
        SELECT id, status FROM products
        WHERE code = ${code} AND "deletedAt" IS NULL
        FOR UPDATE
      `;
      if (locked.length === 0) throw new Error("NOT_FOUND");
      if (locked[0].status !== "AVAILABLE") throw new Error("ALREADY_SOLD");

      const product = await tx.product.findUniqueOrThrow({ where: { code } });

      // What it costs right now. Asked again inside the transaction rather
      // than trusted from the page, so a sale that ended while the dialog sat
      // open cannot be bought at the old price — and, before this, a sale that
      // was running charged the ordinary price no matter what the shop had
      // scheduled.
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

      // Software is priced by the tier the buyer picked and sold in multiples;
      // an account has neither. Both are resolved inside the transaction for
      // the same reason the price is: the tier could have been retired, or its
      // price changed, while the page sat open.
      const isSoftware = product.productType === "SOFTWARE_GAME";

      let chosenPackage: { id: string; price: bigint; label: string } | null = null;
      if (isSoftware) {
        const wanted = body?.packageId?.trim();
        if (!wanted) throw new Error("PACKAGE_REQUIRED");
        // Scoped to this product, so a package id copied from another listing
        // cannot be used to buy this one at that one's price.
        const found = await tx.productPackage.findFirst({
          where: { id: wanted, productId: product.id },
          select: { id: true, price: true, label: true },
        });
        if (!found) throw new Error("BAD_PACKAGE");
        chosenPackage = found;
      }

      const quantity = isSoftware
        ? Math.min(99, Math.max(1, Math.floor(Number(body?.quantity ?? 1)) || 1))
        : 1;

      // A flash sale discounts the account's own price. It has no meaning
      // against a tier list, so software takes the tier price as it stands.
      const unitPrice = chosenPackage
        ? chosenPackage.price
        : (sale?.salePrice ?? product.price);
      const lineTotal = unitPrice * BigInt(quantity);

      // Voucher, if supplied and still usable. The same rules back the
      // "Áp dụng" preview, so what the dialog quoted is what is charged.
      let voucherId: string | null = null;
      let voucherCut = 0n;
      if (voucherCode) {
        const v = await tx.voucher.findUnique({ where: { code: voucherCode } });
        // Judged against the line total, not the unit price: a minimum-spend
        // voucher should be met by buying three keys, and a percentage one
        // should come off all three.
        const applied = evaluateVoucher(v, lineTotal, now);
        if (!v || !applied.ok) throw new Error("BAD_VOUCHER");

        voucherId = v.id;
        voucherCut = applied.cut;

        await tx.voucher.update({
          where: { id: v.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const total = lineTotal - voucherCut;

      // Re-read the balance inside the transaction — the value on the session
      // object was loaded earlier and may be stale.
      const buyer = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (buyer.balance < total) {
        throw new Error(`INSUFFICIENT:${total - buyer.balance}`);
      }

      const balanceAfter = buyer.balance - total;

      await tx.user.update({
        where: { id: user.id },
        data: { balance: balanceAfter },
      });

      // An account is gone once it is bought; software is a licence and the
      // listing stays up for the next buyer. Marking a tool SOLD would take it
      // off the shop the first time anybody bought a one-day key.
      await tx.product.update({
        where: { id: product.id },
        data: {
          ...(isSoftware ? {} : { status: "SOLD" as const }),
          soldCount: { increment: quantity },
        },
      });

      // Software has no crossed-out price to discount from, so the tier price
      // is both the list price and what was charged.
      const listPrice = isSoftware ? lineTotal : product.oldPrice;
      const discountPct =
        !isSoftware && product.oldPrice > 0n
          ? Number(((product.oldPrice - unitPrice) * 100n) / product.oldPrice)
          : 0;

      const order = await tx.order.create({
        data: {
          code: makeCode("DH"),
          userId: user.id,
          productId: product.id,
          packageId: chosenPackage?.id ?? null,
          quantity,
          method: "BUY_NOW",
          status: "PAID",
          listPrice,
          discountPct,
          voucherId,
          voucherCut,
          total,
        },
      });

      await tx.transaction.create({
        data: {
          code: makeCode("GD"),
          userId: user.id,
          kind: "PURCHASE",
          status: "SUCCESS",
          delta: -total,
          balanceAfter,
          description: chosenPackage
            ? `Mua ${product.name ?? product.code} — ${chosenPackage.label}${
                quantity > 1 ? ` ×${quantity}` : ""
              }`
            : `Mua tài khoản #${product.code}`,
          method: "Ví Menzu",
        },
      });

      return { order, balanceAfter, total };
    });

    return NextResponse.json({
      orderCode: result.order.code,
      total: Number(result.total),
      balance: Number(result.balanceAfter),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "NOT_FOUND") {
      return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
    }
    if (message === "ALREADY_SOLD") {
      return NextResponse.json({ error: "Tài khoản đã được bán" }, { status: 409 });
    }
    if (message === "PACKAGE_REQUIRED") {
      return NextResponse.json({ error: "Hãy chọn gói trước khi mua" }, { status: 400 });
    }
    if (message === "BAD_PACKAGE") {
      // Also the answer when a tier was retired while the page sat open, which
      // is why it does not say the id was wrong.
      return NextResponse.json(
        { error: "Gói này không còn bán, hãy chọn lại" },
        { status: 409 },
      );
    }
    if (message === "BAD_VOUCHER") {
      return NextResponse.json(
        { error: "Mã giảm giá không hợp lệ hoặc đã hết hạn" },
        { status: 400 },
      );
    }
    if (message.startsWith("INSUFFICIENT:")) {
      const shortfall = Number(message.slice("INSUFFICIENT:".length));
      return NextResponse.json(
        { error: "Số dư không đủ", shortfall },
        { status: 402 },
      );
    }

    console.error("order failed", error);
    return NextResponse.json({ error: "Không thể tạo đơn hàng" }, { status: 500 });
  }
}

/** Purchase history for /orders. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { code: true, imageUrl: true, rank: true } } },
  });

  return NextResponse.json({
    items: orders.map((o) => ({
      code: o.code,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
      product: o.product,
    })),
  });
}
