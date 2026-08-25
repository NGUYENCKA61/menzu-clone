import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/**
 * Mark a physical prize as sent, or put it back in the queue.
 *
 * Only ever moves between PENDING and SENT: a row that settled itself carries
 * NONE and has nothing for the shop to do, so letting this endpoint touch it
 * would put money and points into a parcel queue.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    sent?: boolean;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu phần quà" }, { status: 400 });
  if (typeof body?.sent !== "boolean") {
    return NextResponse.json({ error: "Thiếu trạng thái" }, { status: 400 });
  }

  const win = await db.spinWin.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!win) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (win.status === "NONE") {
    return NextResponse.json(
      { error: "Phần thưởng này đã tự cộng vào tài khoản, không cần gửi" },
      { status: 409 },
    );
  }

  await db.spinWin.update({
    where: { id },
    data: { status: body.sent ? "SENT" : "PENDING" },
  });

  return NextResponse.json({ ok: true });
}
