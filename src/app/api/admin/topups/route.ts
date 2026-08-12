import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { creditTopUp } from "@/lib/topupStore";

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
  // No expected amount: an admin looking at the bank statement has already
  // decided this transfer is the one, which is exactly the judgement the
  // automatic path is not allowed to make.
  const result = await creditTopUp(code, {
    note: `Ngân Hàng · duyệt bởi ${admin.username}`,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Lệnh nạp vừa được người khác xử lý" },
      { status: 409 },
    );
  }

  return NextResponse.json({
    code: result.code,
    status: "COMPLETED",
    username: result.username,
    balance: result.balance,
  });
}
