import { NextResponse } from "next/server";

import { getAdmin } from "@/lib/admin";
import { announceToUser } from "@/lib/announcementStore";
import { db } from "@/lib/db";

const TRACKING_MAX = 60;
const NOTE_MAX = 300;

/**
 * The shop answers a parcel: a courier number, a sentence, or both.
 *
 * Separate from the "đã gửi" tick because they are separate acts — a shop can
 * have a tracking number before the parcel moves, and can post something it
 * never got a number for. Writing one here does not decide the other.
 *
 * The winner is told, and told loudly for once: this one is not silent. They
 * gave an address and have been waiting on exactly this answer.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    tracking?: string;
    note?: string;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu mã lượt trúng" }, { status: 400 });

  const tracking = (body?.tracking ?? "").trim().slice(0, TRACKING_MAX);
  const note = (body?.note ?? "").trim().slice(0, NOTE_MAX);
  if (!tracking && !note) {
    return NextResponse.json(
      { error: "Nhập mã vận đơn hoặc lời nhắn cho khách." },
      { status: 400 },
    );
  }

  const win = await db.spinWin.findUnique({
    where: { id },
    select: { id: true, userId: true, label: true, address: true },
  });
  if (!win) {
    return NextResponse.json({ error: "Không tìm thấy lượt trúng" }, { status: 404 });
  }
  // Nothing to answer yet: the shop would be telling somebody a parcel is on
  // its way to an address they have not given.
  if (!win.address) {
    return NextResponse.json(
      { error: "Khách chưa điền địa chỉ nhận hàng." },
      { status: 400 },
    );
  }

  await db.spinWin.update({
    where: { id: win.id },
    data: { tracking: tracking || null, shopNote: note || null },
  });

  await announceToUser(win.userId, {
    title: `Shop đã phản hồi phần quà ${win.label}`,
    body: tracking ? `Mã vận đơn: ${tracking}.${note ? ` ${note}` : ""}` : note,
    silent: false,
    cta: { label: "Xem chi tiết", href: `/vong-quay/qua/${win.id}` },
  });

  return NextResponse.json({ ok: true });
}
