import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

function makeCode(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Confirms or rejects a pending top-up.
 *
 * Confirming is the only path that puts money in a wallet, so the balance and
 * its ledger row are written in one transaction, and the status is moved from
 * PENDING inside that same transaction. A double click, or two admins looking
 * at the same queue, therefore credits once: the second update matches no row
 * and the whole thing rolls back.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    action?: string;
  } | null;

  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã lệnh nạp" }, { status: 400 });

  const topUp = await db.topUp.findUnique({
    where: { code },
    include: { user: { select: { id: true, username: true } } },
  });
  if (!topUp) {
    return NextResponse.json({ error: "Không tìm thấy lệnh nạp" }, { status: 404 });
  }
  if (topUp.status !== "PENDING") {
    return NextResponse.json(
      { error: `Lệnh nạp này đã được xử lý (${topUp.status})` },
      { status: 409 },
    );
  }

  // --- reject --------------------------------------------------------------
  if (body?.action === "reject") {
    await db.topUp.update({ where: { id: topUp.id }, data: { status: "FAILED" } });
    return NextResponse.json({ code: topUp.code, status: "FAILED" });
  }

  // --- confirm -------------------------------------------------------------
  const result = await db
    .$transaction(async (tx) => {
      // Claim the row first. `count: 0` means somebody else got there.
      const claimed = await tx.topUp.updateMany({
        where: { id: topUp.id, status: "PENDING" },
        data: { status: "COMPLETED" },
      });
      if (claimed.count === 0) throw new Error("ALREADY_HANDLED");

      const current = await tx.user.findUniqueOrThrow({ where: { id: topUp.userId } });
      const balanceAfter = current.balance + topUp.amount;

      await tx.user.update({
        where: { id: topUp.userId },
        data: { balance: balanceAfter },
      });

      await tx.transaction.create({
        data: {
          code: makeCode("GD"),
          userId: topUp.userId,
          kind: "TOPUP",
          status: "SUCCESS",
          delta: topUp.amount,
          balanceAfter,
          description: `Nạp tiền vào ví · ${topUp.code}`,
          method: topUp.method === "CARD" ? "Thẻ Cào" : "Ngân Hàng",
        },
      });

      return balanceAfter;
    })
    .catch((error: unknown) => {
      if (error instanceof Error && error.message === "ALREADY_HANDLED") return null;
      throw error;
    });

  if (result === null) {
    return NextResponse.json(
      { error: "Lệnh nạp vừa được người khác xử lý" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    code: topUp.code,
    status: "COMPLETED",
    username: topUp.user.username,
    balance: Number(result),
  });
}
