import { NextResponse } from "next/server";

import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { messagePreview, readMessage } from "@/lib/warrantyChat";
import { notifyWarranty } from "@/lib/warrantyNotify";
import { warrantyOpen } from "@/lib/warrantyRequests";
import { MESSAGE_SELECT, toChatMessage } from "@/lib/warrantyThread";

/** The desk's reply box holds this much, like an action's note. */
const NOTE_MAX = 500;

/**
 * The ticket page's poll (/admin/warranty/[id]): the ticket's state and the
 * messages after a moment the page already has, so a buyer's answer shows
 * while the admin is still on the page.
 */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  const after = new Date(url.searchParams.get("after") ?? "");
  if (!id) return NextResponse.json({ error: "Thiếu mã yêu cầu" }, { status: 400 });

  const ticket = await db.warrantyRequest.findUnique({
    where: { id },
    select: {
      status: true,
      bankSubmittedAt: true,
      messages: {
        where: Number.isNaN(after.getTime()) ? {} : { createdAt: { gt: after } },
        orderBy: { createdAt: "asc" },
        take: 100,
        select: MESSAGE_SELECT,
      },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });

  return NextResponse.json(
    {
      status: ticket.status,
      // A bank account arriving changes what the page offers ("Đã chuyển
      // khoản" wakes up), so it is news too.
      bankSubmittedAt: ticket.bankSubmittedAt?.toISOString() ?? null,
      messages: ticket.messages.map(toChatMessage),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * The shop says something on a ticket without moving it — a question, a step
 * to try, "đang kiểm tra" (the owner, 01/10/2026). Only while the ticket is
 * open; once it is marked fixed or refunded the conversation is closed.
 *
 * Answering a report nobody had picked up yet picks it up: OPEN becomes
 * IN_PROGRESS, which is what the buyer would have been told by hand.
 *
 * The buyer hears on the bell every time and by email at most once every ten
 * minutes per ticket (notifyWarranty with `chat`).
 */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { id?: unknown; body?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  if (!id) return NextResponse.json({ error: "Thiếu mã yêu cầu" }, { status: 400 });
  const said = readMessage(body?.body, false);
  if (!said.ok) return NextResponse.json({ error: said.error }, { status: 400 });
  if (said.body.length > NOTE_MAX) {
    return NextResponse.json({ error: `Tin nhắn tối đa ${NOTE_MAX} ký tự.` }, { status: 400 });
  }

  const ticket = await db.warrantyRequest.findUnique({
    where: { id },
    select: { status: true, userId: true, order: { select: { code: true } } },
  });
  if (!ticket) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  if (!warrantyOpen(ticket.status)) {
    return NextResponse.json(
      { error: "Yêu cầu này đã xử lý xong — khung trao đổi đã đóng." },
      { status: 400 },
    );
  }

  await db.$transaction([
    db.warrantyMessage.create({
      data: { requestId: id, fromShop: true, authorId: admin.id, body: said.body },
    }),
    db.warrantyRequest.updateMany({ where: { id, status: "OPEN" }, data: { status: "IN_PROGRESS" } }),
  ]);

  const code = ticket.order.code;
  await notifyWarranty(
    ticket.userId,
    code,
    { title: "Shop vừa nhắn về yêu cầu bảo hành", body: `Đơn ${code}: ${messagePreview(said.body)}` },
    { ticketId: id, chat: true },
  );

  return NextResponse.json({ ok: true });
}
