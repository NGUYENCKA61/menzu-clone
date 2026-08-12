import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

const STATUSES = new Set(["PENDING", "IN_PROGRESS", "DONE", "CANCELLED"]);

/**
 * Moves a service order along its workflow.
 *
 * Status only — the amount was agreed when the order was placed, and letting
 * it be edited afterwards would rewrite what a customer was told they owed.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    status?: string;
  } | null;

  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã đơn" }, { status: 400 });

  const status = body?.status;
  if (!status || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  const existing = await db.serviceOrder.findUnique({ where: { code } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

  // A finished job should not quietly reopen; cancelling one that is already
  // done would also leave the customer's history contradicting itself.
  if (existing.status === "DONE" && status !== "DONE") {
    return NextResponse.json(
      { error: "Đơn đã hoàn tất, không thể đổi trạng thái" },
      { status: 409 },
    );
  }

  const updated = await db.serviceOrder.update({
    where: { code },
    data: { status: status as typeof existing.status },
  });

  return NextResponse.json({ code: updated.code, status: updated.status });
}
