import { NextResponse } from "next/server";

import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/**
 * Has anything come in on the warranty desk since the page was drawn? New
 * reports, buyers' messages, bank accounts sent. Counted, not shipped: the
 * desk shows "có cập nhật mới" and reloads when asked, rather than moving
 * cards under an admin who is typing an answer.
 */
export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Không có quyền" }, { status: 403 });
  }
  const since = new Date(new URL(request.url).searchParams.get("since") ?? "");
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Thiếu mốc thời gian" }, { status: 400 });
  }

  const [messages, tickets] = await Promise.all([
    db.warrantyMessage.count({ where: { fromShop: false, createdAt: { gt: since } } }),
    db.warrantyRequest.count({
      where: { OR: [{ createdAt: { gt: since } }, { bankSubmittedAt: { gt: since } }] },
    }),
  ]);

  return NextResponse.json({ fresh: messages + tickets }, { headers: { "Cache-Control": "no-store" } });
}
