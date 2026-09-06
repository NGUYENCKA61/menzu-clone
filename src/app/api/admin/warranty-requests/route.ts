import { NextResponse } from "next/server";

import { getAdmin } from "@/lib/admin";
import { announceToUser } from "@/lib/announcementStore";
import { db } from "@/lib/db";

/** The two moves the desk can make. OPEN is the buyer's to create. */
const MOVES = new Set(["IN_PROGRESS", "RESOLVED"]);
const NOTE_MAX = 500;

/**
 * The shop answers one warranty report.
 *
 * "Đang xử lý" tells the buyer somebody has picked it up; the note is optional
 * there. "Đã xử lý" closes it, and must say what was done — a fresh key, an
 * update to grab, a step they missed — because a closed ticket with no words
 * is the shop hanging up.
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
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu mã yêu cầu" }, { status: 400 });

  const status = body?.status;
  if (!status || !MOVES.has(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const note = (body?.note ?? "").trim().slice(0, NOTE_MAX);
  if (status === "RESOLVED" && !note) {
    return NextResponse.json(
      { error: "Đóng yêu cầu thì phải ghi cho khách biết đã xử lý thế nào." },
      { status: 400 },
    );
  }

  const found = await db.warrantyRequest.findUnique({
    where: { id },
    select: {
      status: true,
      userId: true,
      adminNote: true,
      order: { select: { code: true } },
    },
  });
  if (!found) {
    return NextResponse.json({ error: "Không tìm thấy yêu cầu" }, { status: 404 });
  }
  if (found.status === "RESOLVED") {
    return NextResponse.json(
      { error: "Yêu cầu này đã xử lý xong rồi." },
      { status: 400 },
    );
  }

  await db.warrantyRequest.update({
    where: { id },
    data: {
      status: status as "IN_PROGRESS" | "RESOLVED",
      // A new note replaces the old; an empty one on "đang xử lý" keeps
      // whatever was written before.
      adminNote: note || found.adminNote,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
    },
  });

  // The buyer opened this and is waiting; tell them where it stands.
  await announceToUser(found.userId, {
    title:
      status === "RESOLVED"
        ? "Yêu cầu bảo hành đã xử lý xong"
        : "Yêu cầu bảo hành đang được xử lý",
    body:
      `Đơn ${found.order.code}: ` +
      (status === "RESOLVED"
        ? `shop đã xử lý xong. ${note}`
        : note
          ? `shop đang xử lý. ${note}`
          : "shop đã nhận và đang xử lý, bạn chờ chút nhé."),
    type: "INFO",
    cta: { label: "Xem đơn", href: "/orders" },
  });

  return NextResponse.json({ ok: true });
}
