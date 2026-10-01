import { NextResponse } from "next/server";

import { getAdmin } from "@/lib/admin";
import { maskAccount } from "@/lib/bankRefund";
import { db } from "@/lib/db";
import { readRefundAmount } from "@/lib/refundRequests";
import { settleRefund, warnRefundedAccount } from "@/lib/refundSettle";
import { notifyWarranty } from "@/lib/warrantyNotify";

/**
 * The desk's moves. OPEN is the buyer's to create. REFUND is the shop turning
 * a ticket it cannot fix into money back (the owner, 01/10/2026); TRANSFERRED
 * closes a bank refund once the shop has sent it.
 */
const MOVES = new Set(["IN_PROGRESS", "RESOLVED", "REFUND", "TRANSFERRED"]);
const METHODS = new Set(["WALLET", "MANUAL"]);
const NOTE_MAX = 500;

function money(amount: bigint | number): string {
  return `${Number(amount).toLocaleString("vi-VN")}đ`;
}

/**
 * The shop answers one warranty report.
 *
 * "Đang xử lý" tells the buyer somebody has picked it up; the note is optional
 * there. "Đã xử lý" closes it, and must say what was done — a fresh key, an
 * update to grab, a step they missed — because a closed ticket with no words
 * is the shop hanging up.
 *
 * "Hoàn tiền" is the answer when it cannot be fixed, and it must say why too.
 * To the site account it settles at once: the ticket closes REFUNDED and the
 * order, the spins and the wallet move in one transaction (settleRefund),
 * with an approved refund row written beside them so the refund list stays
 * the one history of money given back. Over a bank it cannot settle yet — the
 * ticket waits in REFUNDING for the buyer's account, and "Đã chuyển khoản"
 * settles it after the shop has sent the money.
 *
 * The buyer hears about every step, on the bell and by email (notifyWarranty).
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: string;
    note?: string;
    method?: string;
    amount?: number | string;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu mã yêu cầu" }, { status: 400 });

  const status = body?.status;
  if (!status || !MOVES.has(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const note = (body?.note ?? "").trim().slice(0, NOTE_MAX);
  if ((status === "RESOLVED" || status === "REFUND") && !note) {
    return NextResponse.json(
      {
        error:
          status === "RESOLVED"
            ? "Đóng yêu cầu thì phải ghi cho khách biết đã xử lý thế nào."
            : "Hoàn tiền thì phải ghi cho khách biết vì sao không khắc phục được.",
      },
      { status: 400 },
    );
  }

  const found = await db.warrantyRequest.findUnique({
    where: { id },
    select: {
      status: true,
      userId: true,
      adminNote: true,
      description: true,
      orderId: true,
      refundMethod: true,
      refundAmount: true,
      bankName: true,
      bankAccount: true,
      order: {
        select: {
          code: true,
          total: true,
          status: true,
          product: {
            select: { code: true, name: true, status: true, productType: true, accountPool: true },
          },
        },
      },
    },
  });
  if (!found) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  }
  if (found.status === "RESOLVED" || found.status === "REFUNDED") {
    return NextResponse.json({ error: "Yêu cầu này đã xử lý xong rồi." }, { status: 400 });
  }
  const code = found.order.code;

  // ---- "Đang xử lý" / "Đã xử lý": no money moves.
  if (status === "IN_PROGRESS" || status === "RESOLVED") {
    if (found.status === "REFUNDING") {
      return NextResponse.json(
        { error: "Phiếu này đang hoàn tiền — xác nhận đã chuyển khoản, hoặc đổi sang hoàn qua tài khoản." },
        { status: 400 },
      );
    }
    try {
      await db.$transaction(async (tx) => {
        // Guarded by the state it was read in: a stale page must not mark
        // "fixed" a ticket another session refunded a moment ago.
        const moved = await tx.warrantyRequest.updateMany({
          where: { id, status: { in: ["OPEN", "IN_PROGRESS"] } },
          data: {
            status,
            // A new note replaces the old; an empty one on "đang xử lý" keeps
            // whatever was written before.
            adminNote: note || found.adminNote,
            resolvedAt: status === "RESOLVED" ? new Date() : null,
          },
        });
        if (moved.count === 0) throw new Error("ALREADY_HANDLED");
        // The note is also a line of the conversation, so the next answer
        // does not overwrite it.
        if (note) {
          await tx.warrantyMessage.create({
            data: { requestId: id, fromShop: true, authorId: admin.id, body: note, status },
          });
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "ALREADY_HANDLED") {
        return NextResponse.json(
          { error: "Phiếu này vừa được xử lý bởi một phiên khác." },
          { status: 409 },
        );
      }
      throw error;
    }
    await notifyWarranty(
      found.userId,
      code,
      {
        title:
          status === "RESOLVED" ? "Yêu cầu bảo hành đã xử lý xong" : "Yêu cầu bảo hành đang được xử lý",
        body:
          `Đơn ${code}: ` +
          (status === "RESOLVED"
            ? `shop đã xử lý xong. ${note}`
            : note
              ? `shop đang xử lý. ${note}`
              : "shop đã nhận và đang xử lý, bạn chờ chút nhé."),
      },
      { ticketId: id },
    );
    return NextResponse.json({ ok: true });
  }

  // ---- Everything below moves money, or promises to.
  if (found.order.status !== "PAID") {
    return NextResponse.json(
      { error: "Đơn này không còn ở trạng thái đã thanh toán — không hoàn tiền được." },
      { status: 400 },
    );
  }

  let amount: bigint;
  let method: "WALLET" | "MANUAL";
  if (status === "REFUND") {
    const picked = body?.method;
    if (!picked || !METHODS.has(picked)) {
      return NextResponse.json(
        { error: "Chọn cách hoàn: qua tài khoản hay qua ngân hàng." },
        { status: 400 },
      );
    }
    method = picked as "WALLET" | "MANUAL";
    const figure = readRefundAmount(body?.amount, Number(found.order.total));
    if (!figure.ok) return NextResponse.json({ error: figure.error }, { status: 400 });
    amount = BigInt(figure.amount);

    // Over a bank: nothing settles until the buyer has given an account and
    // the shop has sent the money. The ticket says how much and waits.
    if (method === "MANUAL") {
      if (found.status === "REFUNDING") {
        return NextResponse.json(
          { error: "Phiếu này đang chờ hoàn qua ngân hàng rồi." },
          { status: 400 },
        );
      }
      const moved = await db.$transaction(async (tx) => {
        const claimed = await tx.warrantyRequest.updateMany({
          where: { id, status: { in: ["OPEN", "IN_PROGRESS"] } },
          data: { status: "REFUNDING", refundMethod: "MANUAL", refundAmount: amount, adminNote: note },
        });
        if (claimed.count > 0) {
          await tx.warrantyMessage.create({
            data: { requestId: id, fromShop: true, authorId: admin.id, body: note, status: "REFUNDING" },
          });
        }
        return claimed.count;
      });
      if (moved === 0) {
        return NextResponse.json(
          { error: "Phiếu này vừa được xử lý bởi một phiên khác." },
          { status: 409 },
        );
      }
      await notifyWarranty(
        found.userId,
        code,
        {
          title: "Đơn được hoàn tiền qua ngân hàng",
          body:
            `Đơn ${code}: ${note} Shop sẽ hoàn ${money(amount)} qua ngân hàng — ` +
            `bạn vào trang trạng thái nhập số tài khoản để nhận tiền.`,
        },
        { ticketId: id },
      );
      return NextResponse.json({ ok: true });
    }
  } else {
    // TRANSFERRED: the bank refund the ticket was waiting on has been sent.
    if (found.status !== "REFUNDING" || found.refundMethod !== "MANUAL" || !found.refundAmount) {
      return NextResponse.json(
        { error: "Phiếu này không đang chờ hoàn qua ngân hàng." },
        { status: 400 },
      );
    }
    if (!found.bankAccount) {
      return NextResponse.json(
        { error: "Khách chưa gửi số tài khoản — chưa xác nhận chuyển khoản được." },
        { status: 400 },
      );
    }
    method = "MANUAL";
    amount = found.refundAmount;
  }

  const reason = `Hoàn tiền theo yêu cầu bảo hành: ${found.description}`.slice(0, 1000);
  const bankLine =
    method === "MANUAL" && found.bankName && found.bankAccount
      ? `${found.bankName} ${maskAccount(found.bankAccount)}`
      : null;

  try {
    await db.$transaction(async (tx) => {
      // Claimed by the state it was read in, inside the transaction: two
      // admins pressing at once must not pay twice.
      const claimed = await tx.warrantyRequest.updateMany({
        where:
          status === "TRANSFERRED"
            ? { id, status: "REFUNDING", bankAccount: { not: null } }
            : { id, status: { in: ["OPEN", "IN_PROGRESS", "REFUNDING"] } },
        data: {
          status: "REFUNDED",
          refundMethod: method,
          refundAmount: amount,
          adminNote: note || found.adminNote,
          resolvedAt: new Date(),
        },
      });
      if (claimed.count === 0) throw new Error("ALREADY_HANDLED");
      if (note) {
        await tx.warrantyMessage.create({
          data: { requestId: id, fromShop: true, authorId: admin.id, body: note, status: "REFUNDED" },
        });
      }

      await tx.refundRequest.create({
        data: {
          orderId: found.orderId,
          userId: found.userId,
          reason,
          status: "APPROVED",
          method,
          amount,
          adminNote: note || (bankLine ? `Đã chuyển khoản về ${bankLine}` : null),
          decidedAt: new Date(),
        },
      });

      await settleRefund(tx, {
        orderId: found.orderId,
        orderCode: code,
        orderTotal: Number(found.order.total),
        userId: found.userId,
        amount,
        method,
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_HANDLED") {
      return NextResponse.json(
        { error: "Phiếu này vừa được xử lý bởi một phiên khác." },
        { status: 409 },
      );
    }
    if (error instanceof Error && error.message === "ALREADY_REFUNDED") {
      return NextResponse.json(
        { error: "Đơn này đã được hoàn tiền rồi — không thể hoàn lần nữa." },
        { status: 409 },
      );
    }
    throw error;
  }

  // Outside the transaction on purpose: a failed notice must not roll back a
  // refund that already paid out.
  await notifyWarranty(
    found.userId,
    code,
    {
      title: method === "WALLET" ? "Đơn đã được hoàn tiền" : "Đã chuyển khoản hoàn tiền",
      body:
        method === "WALLET"
          ? `Đơn ${code}: ${note} Shop đã hoàn ${money(amount)} vào tài khoản của bạn trên web.`
          : `Đơn ${code}: shop đã chuyển ${money(amount)} về tài khoản ${bankLine ?? "của bạn"}.${note ? ` ${note}` : ""}`,
    },
    { ticketId: id },
  );
  await warnRefundedAccount(found.order.product, code);

  return NextResponse.json({ ok: true });
}
