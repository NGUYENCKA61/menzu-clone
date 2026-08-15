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
  if (clash && !clash.deletedAt) {
    return NextResponse.json({ error: "Mã tài khoản đã tồn tại" }, { status: 409 });
  }
  if (clash?.deletedAt) {
    // The code is held by a removed product the admin cannot see, so refusing
    // here would be a dead end: the screen shows no such account, yet the code
    // is refused as taken. Re-adding it brings that row back carrying the
    // values just typed, which keeps its order history attached.
    const revived = await db.product.update({
      where: { code },
      data: {
        deletedAt: null,
        categoryId: category.id,
        rank: body?.rank?.trim() || "Unranked",
        price: BigInt(Math.floor(price)),
        oldPrice: BigInt(Math.floor(oldPrice)),
        status: "AVAILABLE",
      },
    });
    return NextResponse.json({ code: revived.code, revived: true });
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
        `/sites/menzu-lol-f7ae197a/root-8a5edab2/images/account/${code}.webp`,
    },
  });

  return NextResponse.json({ code: product.code });
}

/**
 * Remove a product.
 *
 * Two removals, and which one runs is decided by the data rather than offered
 * as a choice — an admin should not have to know the shape of the schema to
 * take an account off the shelf.
 *
 * Nothing has ordered it: the row goes, which also frees its code for reuse.
 * Something has: the row is marked removed instead. `Order.productId` is
 * required and the relation restricts, so the database refuses a real delete
 * the moment an account has sold once; and forcing it past that would strip
 * the code, rank and picture off every past order, because the order row keeps
 * only the money and reads the rest back through this join.
 *
 * Either way the product leaves every listing. The difference is only whether
 * it can be brought back.
 */
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
  if (product.deletedAt) {
    return NextResponse.json({ error: "Sản phẩm đã bị xoá rồi" }, { status: 409 });
  }

  if (product._count.orders === 0) {
    await db.product.delete({ where: { code } });
    return NextResponse.json({ ok: true, mode: "hard" });
  }

  await db.product.update({ where: { code }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true, mode: "soft", orders: product._count.orders });
}

/** Undo a soft delete, putting the product back exactly as it was. */
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const code = new URL(request.url).searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Thiếu mã" }, { status: 400 });

  const product = await db.product.findUnique({ where: { code } });
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  if (!product.deletedAt) {
    return NextResponse.json({ error: "Sản phẩm đang hiển thị" }, { status: 409 });
  }

  // Status is left alone: it is restored to whatever it was when removed, so
  // an account that was hidden comes back hidden rather than back on sale.
  await db.product.update({ where: { code }, data: { deletedAt: null } });
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
