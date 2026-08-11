import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/** Create a product. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    categorySlug?: string;
    rank?: string;
    price?: number;
    oldPrice?: number;
    level?: number;
    imageUrl?: string;
  } | null;

  const code = body?.code?.trim().toUpperCase();
  const categorySlug = body?.categorySlug?.trim();
  const price = Number(body?.price ?? 0);
  const oldPrice = Number(body?.oldPrice ?? price);

  if (!code) return NextResponse.json({ error: "Thiếu mã tài khoản" }, { status: 400 });
  if (!categorySlug) {
    return NextResponse.json({ error: "Thiếu danh mục" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Giá bán không hợp lệ" }, { status: 400 });
  }
  if (oldPrice < price) {
    return NextResponse.json(
      { error: "Giá gốc phải lớn hơn hoặc bằng giá bán" },
      { status: 400 },
    );
  }

  const category = await db.category.findUnique({ where: { slug: categorySlug } });
  if (!category) {
    return NextResponse.json({ error: "Danh mục không tồn tại" }, { status: 404 });
  }

  const clash = await db.product.findUnique({ where: { code } });
  if (clash) {
    return NextResponse.json({ error: "Mã tài khoản đã tồn tại" }, { status: 409 });
  }

  const product = await db.product.create({
    data: {
      code,
      categoryId: category.id,
      rank: body?.rank?.trim() || "Unranked",
      level: Number(body?.level ?? 0) || 0,
      price: BigInt(Math.floor(price)),
      oldPrice: BigInt(Math.floor(oldPrice)),
      imageUrl:
        body?.imageUrl?.trim() ||
        `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/${code}.png`,
    },
  });

  return NextResponse.json({ code: product.code });
}

/** Delete a product. Refuses if it has been ordered — that would orphan history. */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const code = new URL(request.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const product = await db.product.findUnique({
    where: { code },
    include: { _count: { select: { orders: true } } },
  });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  }
  if (product._count.orders > 0) {
    return NextResponse.json(
      { error: "Sản phẩm đã có đơn hàng, hãy ẩn thay vì xoá" },
      { status: 409 },
    );
  }

  await db.product.delete({ where: { code } });
  return NextResponse.json({ ok: true });
}

/** Update status — the safe way to retire a product that already has orders. */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    status?: string;
    price?: number;
  } | null;

  const code = body?.code;
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const allowed = ["AVAILABLE", "RESERVED", "SOLD", "HIDDEN"] as const;
  type Status = (typeof allowed)[number];
  const status = allowed.includes(body?.status as Status)
    ? (body?.status as Status)
    : undefined;

  const price =
    body?.price !== undefined && Number.isFinite(Number(body.price))
      ? BigInt(Math.floor(Number(body.price)))
      : undefined;

  if (!status && price === undefined) {
    return NextResponse.json({ error: "Không có thay đổi" }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { code } });
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  await db.product.update({
    where: { code },
    data: { ...(status ? { status } : {}), ...(price !== undefined ? { price } : {}) },
  });

  return NextResponse.json({ ok: true });
}
