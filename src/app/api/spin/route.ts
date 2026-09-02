import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { announceToUser } from "@/lib/announcementStore";
import { readVoucherDays } from "@/lib/spin";
import { listSpinPrizes } from "@/lib/spinPrizes";
import { getCurrentUser } from "@/lib/session";
import { drawPrize, SPIN_COST } from "@/lib/spin";
import { makeCode } from "@/lib/topupStore";

/**
 * One spin.
 *
 * The server draws, not the browser: a wheel that told the server what it won
 * would be a form the shop pays out on. What the browser gets back is the
 * slice to stop at, and the animation is theatre performed after the fact —
 * which is also why the points are already gone by the time the wheel starts
 * turning, and why closing the tab mid-spin cannot undo the charge.
 *
 * The whole thing sits in one transaction whose first act is a conditional
 * decrement: `updateMany` matching the points that were just read only touches
 * a row nobody else has moved, so two spins fired together cannot both pass
 * the balance check. The loser gets RETRY and answers 409 rather than paying
 * once for two draws.
 */
/** What the bell says about each kind of win. */
const WON_BODY: Record<
  string,
  (p: { label: string; amount: number; voucherCode: string | null }) => string
> = {
  BALANCE: (p) =>
    `${p.amount.toLocaleString("vi-VN")}đ đã được cộng thẳng vào ví của bạn.`,
  POINTS: (p) =>
    `${p.amount.toLocaleString("vi-VN")} điểm đã được cộng, quay tiếp được ngay.`,
  VOUCHER: (p) =>
    `Mã giảm giá của bạn: ${p.voucherCode ?? ""}. Dùng được một lần khi thanh toán.`,
  ITEM: () =>
    "Điền địa chỉ nhận hàng ở trang vòng quay để shop gửi cho bạn, hoặc đổi lấy điểm nếu không có nhu cầu.",
};

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để quay" }, { status: 401 });
  }

  try {
    const prizes = await listSpinPrizes();

    const result = await db.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { points: true, balance: true },
      });

      if (before.points < SPIN_COST) {
        throw new Error(`SHORT:${SPIN_COST - before.points}`);
      }

      const charged = await tx.user.updateMany({
        where: { id: user.id, points: before.points },
        data: { points: { decrement: SPIN_COST } },
      });
      if (charged.count === 0) throw new Error("RETRY");

      const { index, prize } = drawPrize(Math.random(), prizes);

      if (prize.kind === "POINTS") {
        await tx.user.update({
          where: { id: user.id },
          data: { points: { increment: prize.amount } },
        });
      }

      if (prize.kind === "BALANCE") {
        const credited = await tx.user.update({
          where: { id: user.id },
          data: { balance: { increment: BigInt(prize.amount) } },
          select: { balance: true },
        });
        // Money moved, so the ledger records it — /transactions prints both the
        // delta and the balance it left behind, and a credit missing from there
        // would look to the customer like money that appeared from nowhere.
        await tx.transaction.create({
          data: {
            code: makeCode("GD"),
            userId: user.id,
            kind: "REWARD",
            status: "SUCCESS",
            delta: BigInt(prize.amount),
            balanceAfter: credited.balance,
            description: `Trúng thưởng vòng quay: ${prize.label}`,
            method: "Vòng quay",
          },
        });
      }

      // A code of this winner's own, good once. Handing out one shared code
      // would make the prize a price cut the moment somebody posted it.
      let voucherCode: string | null = null;
      if (prize.kind === "VOUCHER") {
        voucherCode = makeCode("VQ");
        const shopRow = prizes.find((p) => p.id === prize.id);
        await tx.voucher.create({
          data: {
            code: voucherCode,
            percentOff: prize.amount,
            maxUses: 1,
            active: true,
            expiresAt: new Date(
              Date.now() +
                readVoucherDays(shopRow?.voucherDays) * 24 * 3600 * 1000,
            ),
          },
        });
      }

      // Written for every spin, not only the ones that owe something: the
      // receipt is what answers "tôi quay ra cái gì" later, and for an ITEM it
      // is the only record that a parcel is owed at all.
      const win = await tx.spinWin.create({
        data: {
          userId: user.id,
          prizeId: prize.id,
          label: prize.label,
          kind: prize.kind,
          amount: prize.amount,
          voucherCode,
          status: prize.kind === "ITEM" ? "PENDING" : "NONE",
        },
      });

      const after = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { points: true, balance: true },
      });

      return {
        index,
        // The receipt's own id, so the notice can point at this parcel rather
        // than at the wheel and leave the winner to find it.
        winId: win.id,
        prize: {
          id: prize.id,
          label: prize.label,
          kind: prize.kind,
          amount: prize.amount,
          image: prize.image ?? null,
          voucherCode,
        },
        points: after.points,
        balance: Number(after.balance),
      };
    });

    // Whatever the wheel gave, it lands in the bell too. The card on screen
    // says it first; this is the copy that is still there tomorrow, and for a
    // parcel it carries the way back to the form.
    if (result.prize.kind !== "NOTHING") {
      await announceToUser(user.id, {
        title: `Bạn vừa trúng ${result.prize.label}`,
        body: WON_BODY[result.prize.kind](result.prize),
        ...(result.prize.kind === "ITEM"
          ? {
              cta: {
                label: "Điền địa chỉ nhận",
                href: `/vong-quay/qua/${result.winId}`,
              },
            }
          : {}),
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message.startsWith("SHORT:")) {
      const missing = Number(message.slice("SHORT:".length));
      return NextResponse.json(
        { error: "Không đủ điểm để quay", missing, cost: SPIN_COST },
        { status: 402 },
      );
    }
    if (message === "RETRY") {
      return NextResponse.json(
        { error: "Có một lượt quay khác đang xử lý, thử lại sau giây lát" },
        { status: 409 },
      );
    }

    console.error("spin failed", error);
    return NextResponse.json({ error: "Không quay được, thử lại sau" }, { status: 500 });
  }
}
