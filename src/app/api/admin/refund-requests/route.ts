import { NextResponse } from "next/server";

import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { readRefundAmount } from "@/lib/refundRequests";
import { makeCode } from "@/lib/topupStore";
import { creditWallet } from "@/lib/wallet";

/** The two answers the desk can give. PENDING is the buyer's to create, not
 *  the shop's to restore — reopening a decided request would leave the buyer
 *  no way to know which round they are in. */
const DECISIONS = new Set(["APPROVED", "REJECTED"]);
const METHODS = new Set(["MANUAL", "WALLET"]);
const NOTE_MAX = 500;

/**
 * The shop answers one refund request.
 *
 * Two ways to say yes, and they differ in whether the money moves here.
 * "Chuyển tay" records the decision and nothing else — the shop pays it out
 * over a bank app and this row is the note that it agreed to. "Hoàn vào ví"
 * credits the buyer's balance, and does so inside the same database
 * transaction that marks the request approved: either both happened or
 * neither did, so the queue can never show a paid refund that the wallet has
 * never heard of.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: string;
    method?: string;
    amount?: number | string;
    note?: string;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu mã yêu cầu" }, { status: 400 });

  const status = body?.status;
  if (!status || !DECISIONS.has(status)) {
    return NextResponse.json({ error: "Quyết định không hợp lệ" }, { status: 400 });
  }

  const note = (body?.note ?? "").trim().slice(0, NOTE_MAX);
  // A refusal with no reason is the shop saying "no" and hanging up; the
  // buyer's next move depends entirely on why.
  if (status === "REJECTED" && !note) {
    return NextResponse.json(
      { error: "Từ chối thì phải ghi lý do cho khách." },
      { status: 400 },
    );
  }

  const found = await db.refundRequest.findUnique({
    where: { id },
    select: {
      status: true,
      userId: true,
      orderId: true,
      order: { select: { code: true, total: true } },
    },
  });
  if (!found) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  }
  if (found.status !== "PENDING") {
    return NextResponse.json(
      { error: "Yêu cầu này đã được xử lý rồi." },
      { status: 400 },
    );
  }

  // A rejection settles nothing and pays nothing.
  if (status === "REJECTED") {
    await db.refundRequest.update({
      where: { id },
      data: { status: "REJECTED", adminNote: note, decidedAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  const method = body?.method;
  if (!method || !METHODS.has(method)) {
    return NextResponse.json(
      { error: "Chọn cách hoàn: vào ví hay chuyển tay." },
      { status: 400 },
    );
  }

  const money = readRefundAmount(body?.amount, Number(found.order.total));
  if (!money.ok) {
    return NextResponse.json({ error: money.error }, { status: 400 });
  }
  const amount = BigInt(money.amount);

  try {
    await db.$transaction(async (tx) => {
    // Claimed by the same condition that was checked above, but inside the
    // transaction: two admins pressing "Chấp nhận" at once must not credit
    // the wallet twice.
      const claimed = await tx.refundRequest.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "APPROVED",
          method: method as "MANUAL" | "WALLET",
          amount,
          adminNote: note || null,
          decidedAt: new Date(),
        },
      });
      if (claimed.count === 0) throw new Error("ALREADY_HANDLED");

      // The order stops reading "Đã thanh toán" the moment the shop agrees to
      // give the money back, whichever way it goes back. Both halves in one
      // transaction: an order still marked paid beside an approved refund is
      // the pair of facts that starts an argument.
      await tx.order.update({
        where: { id: found.orderId },
        data: { status: "REFUNDED" },
      });

      if (method !== "WALLET") return;

      // Incremented by the database rather than computed from a figure read a
      // moment ago, so a purchase settling at the same instant is not lost.
      const balanceAfter = await creditWallet(tx, found.userId, amount);
      await tx.transaction.create({
        data: {
          code: makeCode("GD"),
          userId: found.userId,
          kind: "REFUND",
          status: "SUCCESS",
          delta: amount,
          balanceAfter,
          description: `Hoàn tiền đơn ${found.order.code}`,
          method: "Hoàn vào ví",
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_HANDLED") {
      return NextResponse.json(
        { error: "Yêu cầu này vừa được xử lý bởi một phiên khác." },
        { status: 409 },
      );
    }
    throw error;
  }

  return NextResponse.json({ ok: true });
}
