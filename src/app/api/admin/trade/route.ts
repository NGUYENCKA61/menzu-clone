import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

const STATUSES = new Set(["PENDING", "QUOTED", "ACCEPTED", "REJECTED", "DONE"]);

/**
 * Updates a trade-in request: quote it, accept, reject or close it.
 *
 * The quote is stored but never moves money. Paying a seller happens over
 * Zalo, outside the site, so crediting a wallet here would record a payment
 * that may never have been made.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    status?: string;
    quotedAmount?: number | null;
  } | null;

  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã đơn" }, { status: 400 });

  const existing = await db.tradeRequest.findUnique({ where: { code } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

  const status = body?.status;
  if (status !== undefined && !STATUSES.has(status)) {
    return NextResponse.json({ error: "Trạng thái không hợp lệ" }, { status: 400 });
  }

  let quotedAmount: bigint | null | undefined;
  if (body?.quotedAmount !== undefined) {
    if (body.quotedAmount === null) {
      quotedAmount = null;
    } else {
      const value = Number(body.quotedAmount);
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: "Giá báo không hợp lệ" }, { status: 400 });
      }
      quotedAmount = BigInt(Math.floor(value));
    }
  }

  // A quote without a price is not a quote; catching it here stops a seller
  // being told their account has been valued at nothing.
  const nextStatus = status ?? existing.status;
  const nextQuote = quotedAmount === undefined ? existing.quotedAmount : quotedAmount;
  if (nextStatus === "QUOTED" && (nextQuote === null || nextQuote === 0n)) {
    return NextResponse.json(
      { error: "Nhập giá báo trước khi chuyển sang Đã báo giá" },
      { status: 400 },
    );
  }

  const updated = await db.tradeRequest.update({
    where: { code },
    data: {
      ...(status !== undefined ? { status: status as typeof existing.status } : {}),
      ...(quotedAmount !== undefined ? { quotedAmount } : {}),
    },
  });

  return NextResponse.json({
    code: updated.code,
    status: updated.status,
    quotedAmount: updated.quotedAmount === null ? null : Number(updated.quotedAmount),
  });
}
