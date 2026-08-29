import { NextResponse } from "next/server";

import {
  currentOrderIdOf,
  deliversAutomatically,
  loginHandover,
  readLogin,
  tagOf,
} from "@/lib/accountLogin";
import { agencyCutFor, clampAgencyPercent } from "@/lib/agency";
import { db } from "@/lib/db";
import { deliverKeys } from "@/lib/licenseKeys";
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

      const product = await tx.product.findUniqueOrThrow({
        where: { code },
        // The tag decides whether the sign-in goes out by itself.
        include: { tags: { select: { label: true }, take: 1 } },
      });

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

      let chosenPackage: {
        id: string;
        price: bigint;
        label: string;
        durationHours: number | null;
      } | null = null;
      if (isSoftware) {
        const wanted = body?.packageId?.trim();
        if (!wanted) throw new Error("PACKAGE_REQUIRED");
        // Scoped to this product, so a package id copied from another listing
        // cannot be used to buy this one at that one's price.
        const found = await tx.productPackage.findFirst({
          where: { id: wanted, productId: product.id },
          select: { id: true, price: true, label: true, durationHours: true },
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

      // Re-read the buyer inside the transaction — for the balance below,
      // and for the role: the wholesale price must follow what the row says
      // now, not what the session cached.
      const buyer = await tx.user.findUniqueOrThrow({ where: { id: user.id } });

      // Đại lý pricing: software only, at this account's own negotiated
      // percent, recorded on the order as discountPct so history says what
      // was honoured. Vouchers do not stack on top — wholesale is already
      // the deal, so a supplied code is quietly ignored rather than refused.
      const agencyPct =
        buyer.role === "AGENCY" && isSoftware
          ? clampAgencyPercent(buyer.agencyPercent)
          : 0;
      const agencyCut = agencyPct > 0 ? agencyCutFor(lineTotal, agencyPct) : 0n;

      // Voucher, if supplied and still usable. The same rules back the
      // "Áp dụng" preview, so what the dialog quoted is what is charged.
      let voucherId: string | null = null;
      let voucherCut = 0n;
      if (voucherCode && agencyPct === 0) {
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

      const total = lineTotal - agencyCut - voucherCut;

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
      // is both the list price and what was charged — unless the buyer is an
      // agency, whose percent IS the discount.
      const listPrice = isSoftware ? lineTotal : product.oldPrice;
      const discountPct =
        agencyPct > 0
          ? agencyPct
          : !isSoftware && product.oldPrice > 0n
            ? Number(((product.oldPrice - unitPrice) * 100n) / product.oldPrice)
            : 0;

      const order = await tx.order.create({
        data: {
          code: makeCode("DH"),
          userId: user.id,
          productId: product.id,
          packageId: chosenPackage?.id ?? null,
          quantity,
          // Software is sold on the promise of a key per unit; an account is
          // the thing itself and is owed none.
          keysOwed: isSoftware ? quantity : 0,
          method: "BUY_NOW",
          status: "PAID",
          listPrice,
          discountPct,
          voucherId,
          voucherCut,
          total,
        },
      });

      // The keys come off the shelf inside the same transaction that charges
      // for them, so a sale can never be paid for without the stock moving.
      // Fewer than were bought is not a failure: the tier is out, the order
      // stands, and what is owed shows up on the shop's key desk. Refusing the
      // sale instead would turn every empty shelf into a lost order.
      const delivered = chosenPackage
        ? await deliverKeys(tx, {
            packageId: chosenPackage.id,
            orderId: order.id,
            userId: user.id,
            wanted: quantity,
            durationHours: chosenPackage.durationHours,
          })
        : 0;

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
              }${agencyPct > 0 ? " · giá đại lý" : ""}`
            : `Mua tài khoản #${product.code}`,
          method: "Ví Menzu",
        },
      });

      return {
        order,
        balanceAfter,
        total,
        delivered,
        quantity,
        isSoftware,
        // Whether the sign-in went out with the order — an NFA account with
        // one on the row — or the shop hands this one over in person. Read
        // inside the lock, so it describes the product as it was sold.
        loginReady: deliversAutomatically(tagOf(product)) && readLogin(product) !== null,
      };
    });

    return NextResponse.json({
      orderCode: result.order.code,
      total: Number(result.total),
      balance: Number(result.balanceAfter),
      // What the buy panel needs to say more than "đã mua": how many keys are
      // waiting on /orders, and whether any are still to come — or, for an
      // account, whether a sign-in is waiting there or the shop has to be asked.
      ...(result.isSoftware
        ? { keysDelivered: result.delivered, keysPending: result.quantity - result.delivered }
        : { loginReady: result.loginReady }),
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
    include: {
      product: {
        select: {
          code: true,
          imageUrl: true,
          rank: true,
          productType: true,
          loginUsername: true,
          loginPassword: true,
          loginNote: true,
          orders: {
            where: { status: "PAID" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true },
          },
          tags: { select: { label: true }, take: 1 },
        },
      },
    },
  });

  return NextResponse.json({
    items: orders.map((o) => ({
      code: o.code,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
      product: { code: o.product.code, imageUrl: o.product.imageUrl, rank: o.product.rank },
      // The buyer's own orders only, and nothing unless the order is PAID and
      // still the latest sale of that account — the same gate the page applies.
      login: loginHandover(o, {
        ...o.product,
        currentOrderId: currentOrderIdOf(o.product),
        tag: tagOf(o.product),
      }),
    })),
  });
}
