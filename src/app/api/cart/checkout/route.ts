import { NextResponse } from "next/server";

import { agencyCutFor, clampAgencyPercent } from "@/lib/agency";
import { db } from "@/lib/db";
import { deliverKeys } from "@/lib/licenseKeys";
import { readMemberTier, TIER_RULES, tierDiscountFor } from "@/lib/memberTiers";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { makeShortCode } from "@/lib/shortCode";
import { evaluateVoucherForCart, voucherRules } from "@/lib/voucher";
import { balanceOf, debitWallet } from "@/lib/wallet";

const makeCode = makeShortCode;

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
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const settings = await getShopSettings();
  if (!settings.purchasesEnabled) {
    return NextResponse.json({ error: settings.closedMessage }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as {
    voucher?: string;
  } | null;
  const voucherCode = body?.voucher?.trim() || null;

  try {
    const result = await db.$transaction(async (tx) => {
      const items = await tx.cartItem.findMany({
        where: { userId: user.id },
        // Ordered by product so two baskets holding the same two tools always
        // reach for their rows in the same direction. Two shoppers walking a
        // shared pair in opposite orders would each hold what the other was
        // waiting for, and Postgres would break the tie by killing one of
        // them a second later.
        orderBy: { productId: "asc" },
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              status: true,
              softwareStatus: true,
              deletedAt: true,
              // For the voucher's scope test, line by line.
              categoryId: true,
            },
          },
          package: {
            select: { id: true, label: true, price: true, durationHours: true },
          },
        },
      });
      if (items.length === 0) throw new Error("EMPTY");

      // A line whose product was removed or hidden while the basket sat open
      // stops the whole checkout, named, rather than being silently dropped
      // from a total the shopper already read.
      const dead = items.find(
        (i) => i.product.deletedAt !== null || i.product.status !== "AVAILABLE",
      );
      // A tool caught since it was put in the basket stops the checkout the
      // same way, but says so: "no longer sold" would send the shopper looking
      // for a listing that is still right there.
      const caught = items.find((i) => i.product.softwareStatus === "DETECTED");
      if (!dead && caught) {
        throw new Error(`CAUGHT:${caught.product.name ?? caught.product.code}`);
      }
      if (dead) {
        throw new Error(`GONE:${dead.product.name ?? dead.product.code}`);
      }

      // What the basket is worth at list price, and what each line is worth,
      // kept side by side: the discounts below are shared out per line so the
      // orders written at the end each carry their own honest figure.
      const lineList = items.map((i) => i.package.price * BigInt(i.quantity));
      const listTotal = lineList.reduce((sum, value) => sum + value, 0n);

      // Read inside the transaction, like the single-buy endpoint: the
      // wholesale percent and the member tier must follow what the row says
      // now, not what the session cached.
      const buyer = await tx.user.findUniqueOrThrow({ where: { id: user.id } });

      // Đại lý pricing beats everything else and does not stack — wholesale is
      // already the deal — so a code supplied alongside it is ignored rather
      // than refused, exactly as "Mua ngay" treats it.
      const agencyPct =
        buyer.role === "AGENCY" ? clampAgencyPercent(buyer.agencyPercent) : 0;
      const agencyCut = agencyPct > 0 ? agencyCutFor(listTotal, agencyPct) : 0n;

      // Hạng thành viên: a percent off for everyone not already on wholesale,
      // taken before the voucher so a code prices what the member really pays.
      const memberTier = readMemberTier(buyer.tier);
      const tierPct = agencyPct === 0 ? TIER_RULES[memberTier].discountPercent : 0;
      const tierCut = tierPct > 0 ? tierDiscountFor(listTotal, memberTier) : 0n;

      // The voucher is judged against the basket after those cuts, line by
      // line, so a code tied to one game discounts only that game's lines.
      let voucherId: string | null = null;
      let voucherCut = 0n;
      if (voucherCode && agencyPct === 0) {
        const v = await tx.voucher.findUnique({
          where: { code: voucherCode },
          include: { products: { select: { productId: true } } },
        });
        const afterTier = listTotal - tierCut;
        const applied = evaluateVoucherForCart(
          voucherRules(v),
          items.map((item, index) => ({
            productId: item.product.id,
            categoryId: item.product.categoryId,
            // Each line carries its share of the tier cut, so the eligible
            // subset is priced the same way the whole basket is.
            amount:
              listTotal > 0n
                ? (lineList[index]! * afterTier) / listTotal
                : 0n,
          })),
          new Date(),
        );
        if (!v || !applied.ok) throw new Error("BAD_VOUCHER");

        voucherId = v.id;
        voucherCut = applied.cut;

        // The limit rides on the write, as it does in the single-buy path.
        const bumped = await tx.voucher.updateMany({
          where: {
            id: v.id,
            ...(v.maxUses !== null ? { usedCount: { lt: v.maxUses } } : {}),
          },
          data: { usedCount: { increment: 1 } },
        });
        if (bumped.count === 0) throw new Error("BAD_VOUCHER");
      }

      const total = listTotal - agencyCut - tierCut - voucherCut;

      // The basket is claimed before a single đồng moves, and claimed by the
      // same statement that checks it is still there. Without this, the read
      // above and the delete at the end sat on either side of every order and
      // every key handed over — long enough for a second press, a second tab,
      // or a browser retry to see the same basket and buy it again, charging
      // twice and emptying the shelf twice for one purchase.
      const lineIds = items.map((i) => i.id);
      const claimed = await tx.cartItem.deleteMany({ where: { id: { in: lineIds } } });
      if (claimed.count !== lineIds.length) throw new Error("RACE");

      // Products are locked before the wallet is touched, in the same order
      // the single-buy endpoint locks them, so the two paths can never sit
      // waiting on each other. Quoted because Prisma leaves the column
      // camelCased; sorted so concurrent baskets agree on a direction.
      const productIds = [...new Set(items.map((i) => i.product.id))].sort();
      await tx.$queryRaw`SELECT id FROM products WHERE id = ANY(${productIds}) ORDER BY id FOR UPDATE`;

      // One guarded statement, not "read, subtract, write": a basket paid at
      // the same moment as another purchase would otherwise write a balance
      // that never subtracted the other one.
      const balanceAfter = await debitWallet(tx, user.id, total);
      if (balanceAfter === null) {
        throw new Error(`INSUFFICIENT:${total - (await balanceOf(tx, user.id))}`);
      }

      const orderCodes: string[] = [];
      /** Lines the shelf could not cover, named so the reply can say which. */
      // The basket is charged once but recorded as one order per line, so the
      // discount has to be shared out. Every line takes its proportional part
      // and the last one takes whatever is left, which is what keeps the sum
      // of the orders equal to the đồng actually taken from the wallet.
      let chargedSoFar = 0n;
      let voucherCutSoFar = 0n;
      const discountPct =
        agencyPct > 0 ? agencyPct : tierPct > 0 ? tierPct : 0;

      for (const [index, item] of items.entries()) {
        const lineList = item.package.price * BigInt(item.quantity);
        const last = index === items.length - 1;
        const lineTotal = last
          ? total - chargedSoFar
          : listTotal > 0n
            ? (lineList * total) / listTotal
            : 0n;
        const lineVoucherCut = last
          ? voucherCut - voucherCutSoFar
          : listTotal > 0n
            ? (lineList * voucherCut) / listTotal
            : 0n;
        chargedSoFar += lineTotal;
        voucherCutSoFar += lineVoucherCut;

        const order = await tx.order.create({
          data: {
            code: makeCode("DH"),
            userId: user.id,
            productId: item.product.id,
            packageId: item.package.id,
            quantity: item.quantity,
            // The basket only ever holds software tiers, so every line is
            // owed its keys.
            keysOwed: item.quantity,
            method: "BUY_NOW",
            status: "PAID",
            listPrice: lineList,
            discountPct,
            voucherId,
            voucherCut: lineVoucherCut,
            total: lineTotal,
          },
        });
        orderCodes.push(order.code);

        // Keys move in the same transaction as the money, per line — and a
        // line the shelf cannot cover refuses the whole basket, the way "Mua
        // ngay" refuses a single order. Throwing rolls back every charge,
        // every order and the voucher's use, so nobody pays for a key that
        // does not exist. The message names the line, because a basket of
        // three gives the shopper no way to guess which one it was.
        const delivered = await deliverKeys(tx, {
          packageId: item.package.id,
          orderId: order.id,
          userId: user.id,
          wanted: item.quantity,
          durationHours: item.package.durationHours,
        });
        if (delivered < item.quantity) {
          throw new Error(
            `SHORTKEY:${item.product.name ?? item.product.code}:${delivered}`,
          );
        }

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
          description: `${
            items.length === 1
              ? `Mua ${items[0]!.product.name ?? items[0]!.product.code} — ${items[0]!.package.label}`
              : `Thanh toán giỏ hàng — ${items.length} sản phẩm`
          }${
            agencyPct > 0
              ? " · giá đại lý"
              : tierCut > 0n
                ? ` · ưu đãi hạng ${TIER_RULES[memberTier].label}`
                : ""
          }${voucherCut > 0n ? " · mã giảm giá" : ""}`,
          method: "Ví Menzu",
        },
      });

      // The basket was emptied at the top, as the act of claiming it. Anything
      // added to it while this was running is a new basket and stays.

      return {
        orderCodes,
        total,
        listTotal,
        agencyCut,
        tierCut,
        voucherCut,
        balanceAfter,
      };
    });

    return NextResponse.json({
      orderCodes: result.orderCodes,
      total: Number(result.total),
      // What came off, so the receipt can show the same lines the basket did.
      listTotal: Number(result.listTotal),
      agencyCut: Number(result.agencyCut),
      tierCut: Number(result.tierCut),
      voucherCut: Number(result.voucherCut),
      balance: Number(result.balanceAfter),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "EMPTY") {
      return NextResponse.json({ error: "Giỏ hàng đang trống" }, { status: 400 });
    }
    if (message === "RACE") {
      // Somebody else's statement took these lines first — the shopper's own
      // second press, in practice. Nothing was charged.
      return NextResponse.json(
        { error: "Giỏ hàng vừa được thanh toán, hãy tải lại trang" },
        { status: 409 },
      );
    }
    if (message.startsWith("SHORTKEY:")) {
      // The name is user-facing and can hold a colon ("Valorant: Premium"),
      // so split from the right: the count is the last field, the name is
      // everything between the prefix and it.
      const rest = message.slice("SHORTKEY:".length);
      const cut = rest.lastIndexOf(":");
      const name = cut >= 0 ? rest.slice(0, cut) : rest;
      const left = cut >= 0 ? rest.slice(cut + 1) : "";
      return NextResponse.json(
        {
          error:
            Number(left) > 0
              ? `Số lượng trên hệ thống không đủ — "${name}" chỉ còn ${left} key.`
              : `Số lượng trên hệ thống không đủ — "${name}" đã hết key.`,
        },
        { status: 409 },
      );
    }
    if (message === "BAD_VOUCHER") {
      return NextResponse.json(
        { error: "Mã giảm giá không hợp lệ hoặc không áp dụng cho giỏ này" },
        { status: 400 },
      );
    }
    if (message.startsWith("CAUGHT:")) {
      return NextResponse.json(
        {
          error: `"${message.slice(7)}" đang bị phát hiện, tạm khóa mua key — hãy xoá khỏi giỏ rồi thử lại`,
        },
        { status: 409 },
      );
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
