import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";

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
      const locked = await tx.$queryRaw<{ id: string; status: string }[]>`
        SELECT id, status FROM products WHERE code = ${code} FOR UPDATE
      `;
      if (locked.length === 0) throw new Error("NOT_FOUND");
      if (locked[0].status !== "AVAILABLE") throw new Error("ALREADY_SOLD");

      const product = await tx.product.findUniqueOrThrow({ where: { code } });

      // Voucher, if supplied and still usable.
      let voucherId: string | null = null;
      let voucherCut = 0n;
      if (voucherCode) {
        const v = await tx.voucher.findUnique({ where: { code: voucherCode } });
        const usable =
          v &&
          v.active &&
          (v.expiresAt === null || v.expiresAt.getTime() > Date.now()) &&
          (v.maxUses === null || v.usedCount < v.maxUses);
        if (!usable) throw new Error("BAD_VOUCHER");

        voucherId = v.id;
        voucherCut = v.percentOff
          ? (product.price * BigInt(v.percentOff)) / 100n
          : (v.amountOff ?? 0n);
        if (voucherCut > product.price) voucherCut = product.price;

        await tx.voucher.update({
          where: { id: v.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      const total = product.price - voucherCut;

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

      await tx.product.update({
        where: { id: product.id },
        data: { status: "SOLD", soldCount: { increment: 1 } },
      });

      const discountPct =
        product.oldPrice > 0n
          ? Number(((product.oldPrice - product.price) * 100n) / product.oldPrice)
          : 0;

      const order = await tx.order.create({
        data: {
          code: makeCode("DH"),
          userId: user.id,
          productId: product.id,
          method: "BUY_NOW",
          status: "PAID",
          listPrice: product.oldPrice,
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
          description: `Mua tài khoản #${product.code}`,
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
