import { NextResponse } from "next/server";

import { getAdmin } from "@/lib/admin";
import { announceToUser } from "@/lib/announcementStore";
import { db } from "@/lib/db";
import { readRefundAmount } from "@/lib/refundRequests";
import { settleRefund, warnRefundedAccount } from "@/lib/refundSettle";

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
      order: {
        select: {
          code: true,
          total: true,
          // Read for the notice below: a refunded account order leaves an
          // account nobody can buy and nobody has told the desk about.
          product: {
            select: {
              code: true,
              name: true,
              status: true,
              productType: true,
              accountPool: true,
            },
          },
        },
      },
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
    // The buyer opened this request and has been waiting on an answer; tell
    // them it was declined rather than leaving it silently stuck as pending.
    await announceToUser(found.userId, {
      title: "Yêu cầu hoàn tiền chưa được duyệt",
      body:
        `Đơn ${found.order.code}: yêu cầu hoàn tiền chưa được chấp nhận.` +
        (note ? ` Lý do: ${note}` : " Bạn liên hệ hỗ trợ nếu cần thêm thông tin."),
      type: "INFO",
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

      // The order, the spins and the wallet, settled the one way the warranty
      // desk settles them too.
      await settleRefund(tx, {
        orderId: found.orderId,
        orderCode: found.order.code,
        orderTotal: Number(found.order.total),
        userId: found.userId,
        amount,
        method: method as "MANUAL" | "WALLET",
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_HANDLED") {
      return NextResponse.json(
        { error: "Yêu cầu này vừa được xử lý bởi một phiên khác." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "ALREADY_REFUNDED") {
      return NextResponse.json(
        { error: "Đơn này đã được hoàn tiền rồi, không thể hoàn lần nữa." },
        { status: 409 },
      );
    }
    throw error;
  }

  // Approved, and the money has moved — tell the buyer, and where to see it.
  // Outside the transaction on purpose: a failed notice must not roll back a
  // refund that already paid out.
  const moneyText = `${Number(amount).toLocaleString("vi-VN")}đ`;
  await announceToUser(found.userId, {
    title: "Yêu cầu hoàn tiền được duyệt",
    body:
      method === "WALLET"
        ? `Đơn ${found.order.code} đã được hoàn ${moneyText} vào ví của bạn.`
        : `Đơn ${found.order.code} đã được duyệt hoàn ${moneyText}. Shop sẽ chuyển cho bạn.`,
    type: "INFO",
    ...(method === "WALLET"
      ? { cta: { label: "Xem giao dịch", href: "/transactions" } }
      : {}),
  });

  await warnRefundedAccount(found.order.product, found.order.code);

  return NextResponse.json({ ok: true });
}
