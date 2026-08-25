import { NextResponse } from "next/server";

import { db } from "@/lib/db";
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
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để quay" }, { status: 401 });
  }

  try {
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

      const { index, prize } = drawPrize(Math.random());

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

      // Written for every spin, not only the ones that owe something: the
      // receipt is what answers "tôi quay ra cái gì" later, and for an ITEM it
      // is the only record that a parcel is owed at all.
      await tx.spinWin.create({
        data: {
          userId: user.id,
          prizeId: prize.id,
          label: prize.label,
          kind: prize.kind,
          amount: prize.amount,
          status: prize.kind === "ITEM" ? "PENDING" : "NONE",
        },
      });

      const after = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { points: true, balance: true },
      });

      return {
        index,
        prize: {
          id: prize.id,
          label: prize.label,
          kind: prize.kind,
          amount: prize.amount,
          image: prize.image ?? null,
        },
        points: after.points,
        balance: Number(after.balance),
      };
    });

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
