import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * "Hủy hóa đơn này": the customer withdraws an unpaid top-up request.
 *
 * One atomic updateMany carries every rule — their own row, still unsettled
 * (PENDING or EXPIRED). A request that settled a heartbeat earlier fails the
 * status filter and keeps its money; someone else's code fails the userId
 * filter and learns nothing beyond "không còn hủy được".
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    code?: string;
  } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!code) {
    return NextResponse.json({ error: "Thiếu mã lệnh" }, { status: 400 });
  }

  const updated = await db.topUp.updateMany({
    where: { code, userId: user.id, status: { in: ["PENDING", "EXPIRED"] } },
    data: { status: "CANCELLED" },
  });
  if (updated.count === 0) {
    return NextResponse.json(
      { error: "Lệnh này không còn hủy được" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}
