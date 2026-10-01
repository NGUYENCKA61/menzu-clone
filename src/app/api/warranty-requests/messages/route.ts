import { NextResponse } from "next/server";

import { announceToAdmins } from "@/lib/announcementStore";
import { db } from "@/lib/db";
import { crossSiteRequest } from "@/lib/sameOrigin";
import { absoluteUrl } from "@/lib/seo";
import { getCurrentUser } from "@/lib/session";
import { escapeTelegramHtml, notifyTelegramAdmins } from "@/lib/telegramNotify";
import {
  BURST_WINDOW_MS,
  DAY_MS,
  messagePreview,
  readMessage,
  sendingTooFast,
} from "@/lib/warrantyChat";
import { storeWarrantyImage } from "@/lib/warrantyImage";
import { warrantyOpen } from "@/lib/warrantyRequests";
import { MESSAGE_SELECT, toChatMessage } from "@/lib/warrantyThread";

/**
 * The buyer's side of a warranty ticket's conversation (the owner,
 * 01/10/2026: the buyer and the shop "trao đổi hướng xử lý" until the shop
 * marks it done).
 *
 * GET is the status page's poll: the ticket's state, and the messages after
 * a moment it already has. POST is one message — words, a screenshot, or
 * both — and rings the desk the way a new report does.
 *
 * Both only on the buyer's own ticket: somebody else's answers 404 rather
 * than confirming it exists.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }
  const url = new URL(request.url);
  const id = url.searchParams.get("ticket")?.trim() ?? "";
  const after = new Date(url.searchParams.get("after") ?? "");
  if (!id) return NextResponse.json({ error: "Thiếu mã yêu cầu" }, { status: 400 });

  const ticket = await db.warrantyRequest.findFirst({
    where: { id, userId: user.id },
    select: {
      status: true,
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
    { status: ticket.status, messages: ticket.messages.map(toChatMessage) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  if (crossSiteRequest(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 403 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  // Multipart, like the report itself: a screenshot of the error is often
  // the whole message.
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const id = String(form.get("ticket") ?? "").trim();
  if (!id) return NextResponse.json({ error: "Thiếu mã yêu cầu" }, { status: 400 });
  const file = form.get("image");
  const said = readMessage(form.get("body"), file instanceof File && file.size > 0);
  if (!said.ok) return NextResponse.json({ error: said.error }, { status: 400 });

  const ticket = await db.warrantyRequest.findFirst({
    where: { id, userId: user.id },
    select: {
      status: true,
      order: { select: { code: true, product: { select: { name: true, code: true } } } },
    },
  });
  if (!ticket) return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  // Done means done (the owner): a fixed or refunded ticket is read-only, and
  // a fault that comes back is a new report.
  if (!warrantyOpen(ticket.status)) {
    return NextResponse.json(
      { error: "Yêu cầu này đã xử lý xong — khung trao đổi đã đóng." },
      { status: 400 },
    );
  }

  const now = Date.now();
  const [lastMinute, lastDay] = await Promise.all([
    db.warrantyMessage.count({
      where: { requestId: id, fromShop: false, createdAt: { gte: new Date(now - BURST_WINDOW_MS) } },
    }),
    db.warrantyMessage.count({
      where: { requestId: id, fromShop: false, createdAt: { gte: new Date(now - DAY_MS) } },
    }),
  ]);
  const tooFast = sendingTooFast(lastMinute, lastDay);
  if (tooFast) return NextResponse.json({ error: tooFast }, { status: 429 });

  const image = await storeWarrantyImage(file, user.uid);
  if (!image.ok) return NextResponse.json({ error: image.error }, { status: 400 });

  const message = await db.warrantyMessage.create({
    data: { requestId: id, fromShop: false, authorId: user.id, body: said.body, imageUrl: image.url },
    select: MESSAGE_SELECT,
  });

  // The next move is the shop's: the bell and Telegram, like a new report.
  const code = ticket.order.code;
  const preview = messagePreview(said.body);
  await announceToAdmins({
    title: "Khách nhắn về yêu cầu bảo hành",
    body: `${user.username} · đơn ${code}: ${preview}`,
    priority: "HIGH",
    days: 3,
    cta: { label: "Xem ngay", href: "/admin/warranty" },
  });
  await notifyTelegramAdmins(
    [
      "💬 <b>Khách nhắn về yêu cầu bảo hành</b>",
      `${escapeTelegramHtml(user.username)} · đơn ${escapeTelegramHtml(code)} · ${escapeTelegramHtml(
        ticket.order.product.name ?? ticket.order.product.code,
      )}`,
      escapeTelegramHtml(preview),
      `🔗 ${absoluteUrl("/admin/warranty")}`,
    ].join("\n"),
  );

  return NextResponse.json({ message: toChatMessage(message) });
}
