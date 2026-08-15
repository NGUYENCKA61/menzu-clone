import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";

function makeCode(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${rand}`;
}

/**
 * Pay for everything in the cart, out of the wallet, in one go.
 *
 * One transaction around the whole basket rather than a loop of single
 * purchases: a shopper who can afford two of their three lines should be told
 * they are short, not sold the first two and left with a broken basket and a
 * drained wallet.
 *
 * Prices are re-read here rather than trusted from the cart row, which stores
 * no price at all for exactly this reason — a tier repriced while the basket
 * sat open must charge today's figure, and the order rows keep the snapshot.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const settings = await getShopSettings();
  if (!settings.purchasesEnabled) {
    return NextResponse.json({ error: settings.closedMessage }, { status: 503 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const items = await tx.cartItem.findMany({
        where: { userId: user.id },
        include: {
          product: { select: { id: true, code: true, name: true, status: true, deletedAt: true } },
          package: { select: { id: true, label: true, price: true } },
        },
      });
      if (items.length === 0) throw new Error("EMPTY");

      // A line whose product was removed or hidden while the basket sat open
      // stops the whole checkout, named, rather than being silently dropped
      // from a total the shopper already read.
      const dead = items.find(
        (i) => i.product.deletedAt !== null || i.product.status !== "AVAILABLE",
      );
      if (dead) {
        throw new Error(`GONE:${dead.product.name ?? dead.product.code}`);
      }

      const total = items.reduce(
        (sum, i) => sum + i.package.price * BigInt(i.quantity),
        0n,
      );

      const buyer = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
      if (buyer.balance < total) {
        throw new Error(`INSUFFICIENT:${total - buyer.balance}`);
      }

      const balanceAfter = buyer.balance - total;
      await tx.user.update({ where: { id: user.id }, data: { balance: balanceAfter } });

      const orderCodes: string[] = [];
      for (const item of items) {
        const lineTotal = item.package.price * BigInt(item.quantity);
        const order = await tx.order.create({
          data: {
            code: makeCode("DH"),
            userId: user.id,
            productId: item.product.id,
            packageId: item.package.id,
            quantity: item.quantity,
            method: "BUY_NOW",
            status: "PAID",
            listPrice: lineTotal,
            discountPct: 0,
            voucherCut: 0n,
            total: lineTotal,
          },
        });
        orderCodes.push(order.code);

        // Software is a licence, so the listing stays up. Only the sold tally
        // moves.
        await tx.product.update({
          where: { id: item.product.id },
          data: { soldCount: { increment: item.quantity } },
        });
      }

      // One wallet movement for one payment. Splitting it per line would make
      // the statement disagree with what the shopper actually did.
      await tx.transaction.create({
        data: {
          code: makeCode("GD"),
          userId: user.id,
          kind: "PURCHASE",
          status: "SUCCESS",
          delta: -total,
          balanceAfter,
          description:
            items.length === 1
              ? `Mua ${items[0]!.product.name ?? items[0]!.product.code} — ${items[0]!.package.label}`
              : `Thanh toán giỏ hàng — ${items.length} sản phẩm`,
          method: "Ví Menzu",
        },
      });

      await tx.cartItem.deleteMany({ where: { userId: user.id } });

      return { orderCodes, total, balanceAfter };
    });

    return NextResponse.json({
      orderCodes: result.orderCodes,
      total: Number(result.total),
      balance: Number(result.balanceAfter),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "EMPTY") {
      return NextResponse.json({ error: "Giỏ hàng đang trống" }, { status: 400 });
    }
    if (message.startsWith("GONE:")) {
      return NextResponse.json(
        { error: `"${message.slice(5)}" không còn bán — hãy xoá khỏi giỏ rồi thử lại` },
        { status: 409 },
      );
    }
    if (message.startsWith("INSUFFICIENT:")) {
      return NextResponse.json(
        { error: "Số dư không đủ", shortfall: Number(message.slice("INSUFFICIENT:".length)) },
        { status: 402 },
      );
    }

    console.error(error);
    return NextResponse.json({ error: "Không thể thanh toán" }, { status: 500 });
  }
}
