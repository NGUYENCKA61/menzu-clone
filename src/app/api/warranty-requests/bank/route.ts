import { NextResponse } from "next/server";

import { announceToAdmins } from "@/lib/announcementStore";
import { maskAccount, readBankDetails } from "@/lib/bankRefund";
import { db } from "@/lib/db";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { absoluteUrl } from "@/lib/seo";
import { getCurrentUser } from "@/lib/session";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";
import { notifyWarranty } from "@/lib/warrantyNotify";

/**
 * A buyer gives the account a bank refund should go to — the one step of a
 * refund that is theirs (the owner, 01/10/2026: "khách hàng sẽ nhập stk ngân
 * hàng xác nhận lại stk").
 *
 * Only on their own ticket, and only while it waits on a bank refund. They
 * may send it again until the shop has transferred — a corrected account is
 * better than money sent to the wrong one — and every send rings the desk,
 * because the next move is the shop's.
 *
 * Checked for a cross-site origin like the sign-in routes: this one writes a
 * bank account the shop will send money to.
 */
export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    bankName?: unknown;
    bankAccount?: unknown;
    bankAccountConfirm?: unknown;
    accountHolder?: unknown;
  } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Thiếu mã yêu cầu" }, { status: 400 });

  const details = readBankDetails(body ?? {});
  if (!details.ok) return NextResponse.json({ error: details.error }, { status: 400 });

  // Scoped to this buyer: somebody else's ticket answers 404 rather than
  // confirming it exists.
  const ticket = await db.warrantyRequest.findFirst({
    where: { id, userId: user.id },
    select: {
      status: true,
      refundMethod: true,
      refundAmount: true,
      order: { select: { code: true } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  if (ticket.status !== "REFUNDING" || ticket.refundMethod !== "MANUAL") {
    return NextResponse.json(
      { error: "Yêu cầu này không chờ số tài khoản ngân hàng." },
      { status: 400 },
    );
  }

  // Guarded by the same state, so an account cannot land on a ticket the shop
  // closed a moment ago.
  const saved = await db.warrantyRequest.updateMany({
    where: { id, userId: user.id, status: "REFUNDING" },
    data: {
      bankName: details.bankName,
      bankAccount: details.bankAccount,
      accountHolder: details.accountHolder,
      bankSubmittedAt: new Date(),
    },
  });
  if (saved.count === 0) {
    return NextResponse.json(
      { error: "Yêu cầu này vừa được shop xử lý — bạn tải lại trang nhé." },
      { status: 409 },
    );
  }

  const code = ticket.order.code;
  const amount = `${Number(ticket.refundAmount ?? 0).toLocaleString("vi-VN")}đ`;
  await announceToAdmins({
    title: "Khách đã gửi số tài khoản hoàn tiền",
    body:
      `${user.username} · đơn ${code}: ${details.bankName} ${details.bankAccount} — ` +
      `${details.accountHolder}. Chuyển ${amount} rồi bấm "Đã chuyển khoản".`,
    priority: "HIGH",
    cta: { label: "Xem ngay", href: "/admin/warranty" },
  });
  await notifyTelegramAdmins(
    [
      "🏦 <b>Khách đã gửi số tài khoản hoàn tiền</b>",
      `${escapeTelegramHtml(user.username)} · đơn ${escapeTelegramHtml(code)} · ${amount}`,
      escapeTelegramHtml(`${details.bankName} ${details.bankAccount} — ${details.accountHolder}`),
      `🔗 ${absoluteUrl("/admin/warranty")}`,
    ].join("\n"),
  );
  await notifyWarranty(
    user.id,
    code,
    {
      title: "Đã nhận số tài khoản hoàn tiền",
      body:
        `Đơn ${code}: shop đã nhận số tài khoản ${details.bankName} ` +
        `${maskAccount(details.bankAccount)} và sẽ chuyển ${amount} cho bạn sớm.`,
    },
    { ticketId: id },
  );

  return NextResponse.json({ ok: true });
}
