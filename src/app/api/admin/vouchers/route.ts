import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/** Create a voucher. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    percentOff?: number;
    amountOff?: number;
    maxUses?: number;
    expiresAt?: string;
  } | null;

  const code = body?.code?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Thiếu mã voucher" }, { status: 400 });

  const percentOff = Number(body?.percentOff ?? 0);
  const amountOff = Number(body?.amountOff ?? 0);

  // Exactly one discount kind — supporting both at once would make the
  // checkout maths ambiguous about which applies first.
  if ((percentOff > 0) === (amountOff > 0)) {
    return NextResponse.json(
      { error: "Chọn giảm theo % hoặc theo số tiền, không chọn cả hai" },
      { status: 400 },
    );
  }
  if (percentOff > 0 && (percentOff < 1 || percentOff > 100)) {
    return NextResponse.json({ error: "Phần trăm giảm phải từ 1 đến 100" }, { status: 400 });
  }
  if (amountOff > 0 && amountOff < 1000) {
    return NextResponse.json({ error: "Số tiền giảm tối thiểu 1.000đ" }, { status: 400 });
  }

  const clash = await db.voucher.findUnique({ where: { code } });
  if (clash) return NextResponse.json({ error: "Mã đã tồn tại" }, { status: 409 });

  let expiresAt: Date | null = null;
  if (body?.expiresAt) {
    const parsed = new Date(body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Ngày hết hạn không hợp lệ" }, { status: 400 });
    }
    expiresAt = parsed;
  }

  const maxUsesRaw = Number(body?.maxUses ?? 0);
  const maxUses = Number.isFinite(maxUsesRaw) && maxUsesRaw > 0 ? Math.floor(maxUsesRaw) : null;

  const voucher = await db.voucher.create({
    data: {
      code,
      percentOff: percentOff > 0 ? Math.floor(percentOff) : null,
      amountOff: amountOff > 0 ? BigInt(Math.floor(amountOff)) : null,
      maxUses,
      expiresAt,
    },
  });

  return NextResponse.json({ code: voucher.code });
}

/** Toggle a voucher on or off. Vouchers are never deleted — orders reference them. */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    active?: boolean;
  } | null;

  if (!body?.code || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Thiếu tham số" }, { status: 400 });
  }

  const voucher = await db.voucher.findUnique({ where: { code: body.code } });
  if (!voucher) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  await db.voucher.update({
    where: { code: body.code },
    data: { active: body.active },
  });

  return NextResponse.json({ ok: true });
}
