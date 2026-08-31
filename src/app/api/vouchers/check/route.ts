import { NextResponse } from "next/server";

import { clampAgencyPercent } from "@/lib/agency";
import { db } from "@/lib/db";
import { runningSalePrices } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import {
  evaluateVoucher,
  evaluateVoucherForCart,
  voucherRules,
} from "@/lib/voucher";
import { readMemberTier, tierDiscountFor } from "@/lib/memberTiers";

/** The buy panel's own ceiling; a larger figure here would quote a line the
 *  checkout then refuses. */
const MAX_QUANTITY = 99;

/**
 * Prices one voucher against one purchase, for the "Áp dụng" button.
 *
 * Charges nothing and consumes no use — it answers "what would this cost".
 * The buy endpoint runs the same `evaluateVoucher` against the same figure,
 * so a code that previews at 15% off cannot be refused at checkout: for an
 * account that figure is its price (or its running sale price); for software
 * it is the chosen tier times the quantity, because the buy endpoint judges a
 * minimum-spend code against the whole line and takes a percentage off all
 * of it.
 *
 * Sign-in required: without it this is a free oracle for guessing voucher
 * codes.
 */
/** "What would this code take off my basket?" — charges nothing. */
async function previewCart(userId: string, code: string) {
  const items = await db.cartItem.findMany({
    where: { userId },
    include: {
      product: { select: { id: true, categoryId: true } },
      package: { select: { price: true } },
    },
  });
  if (items.length === 0) {
    return NextResponse.json({ error: "Giỏ hàng đang trống" }, { status: 400 });
  }

  const buyer = await db.user.findUnique({
    where: { id: userId },
    select: { role: true, agencyPercent: true, tier: true },
  });
  if (buyer?.role === "AGENCY" && clampAgencyPercent(buyer.agencyPercent) > 0) {
    return NextResponse.json(
      { error: "Tài khoản đại lý đã hưởng giá sỉ, không dùng kèm mã giảm giá" },
      { status: 400 },
    );
  }

  const lineList = items.map((i) => i.package.price * BigInt(i.quantity));
  const listTotal = lineList.reduce((sum, value) => sum + value, 0n);
  const tierCut = tierDiscountFor(listTotal, readMemberTier(buyer?.tier));
  const afterTier = listTotal - tierCut;

  const voucher = await db.voucher.findUnique({
    where: { code },
    include: { products: { select: { productId: true } } },
  });
  const result = evaluateVoucherForCart(
    voucherRules(voucher),
    items.map((item, index) => ({
      productId: item.product.id,
      categoryId: item.product.categoryId,
      amount: listTotal > 0n ? (lineList[index]! * afterTier) / listTotal : 0n,
    })),
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code,
    cut: Number(result.cut),
    total: Number(result.total),
    unitPrice: Number(afterTier),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    productCode?: string;
    packageId?: string;
    quantity?: number;
    /** Price the code against the signed-in shopper's whole basket instead. */
    cart?: boolean;
  } | null;

  const code = body?.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Thiếu mã giảm giá" }, { status: 400 });
  }

  // The basket has no single product to price against, so it gets its own
  // path — the same one the cart checkout runs, against the same rows, so a
  // code that previews here cannot be refused there.
  if (body?.cart) {
    return previewCart(user.id, code);
  }

  const productCode = body?.productCode?.trim();
  if (!productCode) {
    return NextResponse.json({ error: "Thiếu sản phẩm" }, { status: 400 });
  }

  const product = await db.product.findFirst({
    where: { code: productCode, deletedAt: null },
  });
  if (!product) {
    return NextResponse.json(
      { error: "Không tìm thấy sản phẩm" },
      { status: 404 },
    );
  }

  let base: bigint;
  if (product.productType === "SOFTWARE_GAME") {
    const packageId = body?.packageId?.trim();
    if (!packageId) {
      return NextResponse.json(
        { error: "Chọn gói trước khi áp mã" },
        { status: 400 },
      );
    }
    const pkg = await db.productPackage.findFirst({
      where: { id: packageId, productId: product.id },
    });
    if (!pkg) {
      return NextResponse.json(
        { error: "Không tìm thấy gói" },
        { status: 404 },
      );
    }
    const quantity = Math.min(
      MAX_QUANTITY,
      Math.max(1, Math.floor(Number(body?.quantity ?? 1)) || 1),
    );
    const lineTotal = pkg.price * BigInt(quantity);

    // Wholesale is already the deal: the checkout quietly ignores a code on
    // an agency's software order, so the preview must not promise one.
    const buyer = await db.user.findUnique({
      where: { id: user.id },
      select: { role: true, agencyPercent: true, tier: true },
    });
    if (
      buyer?.role === "AGENCY" &&
      clampAgencyPercent(buyer.agencyPercent) > 0
    ) {
      return NextResponse.json(
        {
          error: "Tài khoản đại lý đã hưởng giá sỉ, không dùng kèm mã giảm giá",
        },
        { status: 400 },
      );
    }
    // The member's own cut comes off first, as at checkout; the code then
    // prices what is left.
    base = lineTotal - tierDiscountFor(lineTotal, readMemberTier(buyer?.tier));
  } else {
    const sale = await runningSalePrices([product.id]);
    base = sale.get(product.id) ?? product.price;
  }

  const voucher = await db.voucher.findUnique({
    where: { code },
    include: { products: { select: { productId: true } } },
  });
  const result = evaluateVoucher(voucherRules(voucher), base, new Date(), {
    productId: product.id,
    categoryId: product.categoryId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code,
    cut: Number(result.cut),
    total: Number(result.total),
    unitPrice: Number(base),
  });
}
