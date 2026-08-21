import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { makeCode } from "@/lib/topupStore";

/**
 * "Rút tiền" on the commission card: moves the whole commission balance into
 * the spendable wallet, with a ledger row so /transactions tells the story.
 *
 * The conditional updateMany is the race guard — it only fires if the
 * commission still equals what was just read, so two simultaneous clicks
 * move the money exactly once.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const moved = await db
    .$transaction(async (tx) => {
      const row = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { commissionBalance: true },
      });
      if (row.commissionBalance <= 0n) return null;

      const claimed = await tx.user.updateMany({
        where: { id: user.id, commissionBalance: row.commissionBalance },
        data: {
          commissionBalance: 0n,
          balance: { increment: row.commissionBalance },
        },
      });
      if (claimed.count === 0) throw new Error("RETRY");

      const after = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { balance: true },
      });
      await tx.transaction.create({
        data: {
          code: makeCode("GD"),
          userId: user.id,
          kind: "REWARD",
          status: "SUCCESS",
          delta: row.commissionBalance,
          balanceAfter: after.balance,
          description: "Rút hoa hồng giới thiệu về ví",
          method: "Hoa hồng",
        },
      });

      return row.commissionBalance;
    })
    .catch((error: unknown) => {
      if (error instanceof Error && error.message === "RETRY") return null;
      throw error;
    });

  if (moved === null) {
    return NextResponse.json(
      { error: "Chưa có hoa hồng để rút" },
      { status: 400 },
    );
  }

  return NextResponse.json({ moved: Number(moved) });
}
