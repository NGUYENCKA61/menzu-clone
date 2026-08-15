import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/** Schedule a sale on one product. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    productCode?: string;
    salePrice?: number;
    startsAt?: string;
    endsAt?: string;
  } | null;

  const code = body?.productCode?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Thiếu mã sản phẩm" }, { status: 400 });

  // A removed product cannot be put on sale — the storefront would not show
  // the sale anyway, so accepting it here would only look like it worked.
  const product = await db.product.findFirst({ where: { code, deletedAt: null } });
  if (!product) return NextResponse.json({ error: "Không tìm thấy sản phẩm" }, { status: 404 });

  const salePrice = Number(body?.salePrice ?? 0);
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    return NextResponse.json({ error: "Giá sale không hợp lệ" }, { status: 400 });
  }
  // A "sale" at or above the shelf price is not a sale, and shoppers notice.
  if (BigInt(Math.floor(salePrice)) >= product.price) {
    return NextResponse.json(
      { error: "Giá sale phải thấp hơn giá bán hiện tại" },
      { status: 400 },
    );
  }

  const startsAt = new Date(body?.startsAt ?? "");
  const endsAt = new Date(body?.endsAt ?? "");
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Thời gian không hợp lệ" }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "Thời gian kết thúc phải sau lúc bắt đầu" }, { status: 400 });
  }

  // Overlapping windows on one product would leave two prices valid at once
  // with nothing deciding which the shopper is charged.
  const clash = await db.flashSale.findFirst({
    where: {
      productId: product.id,
      active: true,
      startsAt: { lte: endsAt },
      endsAt: { gte: startsAt },
    },
  });
  if (clash) {
    return NextResponse.json(
      { error: "Sản phẩm đã có đợt sale trùng khoảng thời gian này" },
      { status: 409 },
    );
  }

  const created = await db.flashSale.create({
    data: {
      productId: product.id,
      salePrice: BigInt(Math.floor(salePrice)),
      startsAt,
      endsAt,
    },
  });

  return NextResponse.json({ id: created.id, productCode: code });
}

/** Switch a scheduled sale on or off, or delete it. */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    active?: boolean;
    remove?: boolean;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });

  const existing = await db.flashSale.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy đợt sale" }, { status: 404 });

  if (body?.remove) {
    await db.flashSale.delete({ where: { id } });
    return NextResponse.json({ removed: true });
  }

  const updated = await db.flashSale.update({
    where: { id },
    data: { active: Boolean(body?.active) },
  });
  return NextResponse.json({ id: updated.id, active: updated.active });
}
