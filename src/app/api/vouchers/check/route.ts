import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { runningSalePrices } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { evaluateVoucher } from "@/lib/voucher";

/**
 * Prices one voucher against one account, for the "Áp dụng" button.
 *
 * Charges nothing and consumes no use — it answers "what would this cost".
 * The buy endpoint runs the same `evaluateVoucher` against the same effective
 * price, so a code that previews at 15% off cannot be refused at checkout.
 *
 * Sign-in required: without it this is a free oracle for guessing voucher
 * codes.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    productCode?: string;
  } | null;

  const code = body?.code?.trim();
  const productCode = body?.productCode?.trim();
  if (!code || !productCode) {
    return NextResponse.json({ error: "Thiếu mã giảm giá" }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { code: productCode } });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy tài khoản" }, { status: 404 });
  }

  const sale = await runningSalePrices([product.id]);
  const unitPrice = sale.get(product.id) ?? product.price;

  const voucher = await db.voucher.findUnique({ where: { code } });
  const result = evaluateVoucher(voucher, unitPrice);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code,
    cut: Number(result.cut),
    total: Number(result.total),
    unitPrice: Number(unitPrice),
  });
}
