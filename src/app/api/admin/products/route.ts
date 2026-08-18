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
    imageUrl?: string;
    tag?: string;
    vip?: number;
    vipIngame?: number;
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

  // Empty string means "back to the default picture": the storefront falls
  // back to the by-code path when this is null, so clearing is a real state
  // and not an error.
  const imageUrl =
    body?.imageUrl !== undefined ? body.imageUrl.trim() || null : undefined;

  // Same shape for the card's corner pill — "DROP MAIL". Empty clears it.
  const tag = body?.tag !== undefined ? body.tag.trim() || null : undefined;
  if (tag && tag.length > 30) {
    return NextResponse.json({ error: "Tag tối đa 30 ký tự" }, { status: 400 });
  }

  // The strip's two labelled numbers, stored in the vp/rp columns. Zero is a
  // real value — it is how the shop takes an entry off the card.
  const readCount = (value: number | undefined) => {
    if (value === undefined) return undefined;
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : null;
  };
  const vip = readCount(body?.vip);
  const vipIngame = readCount(body?.vipIngame);
  if (vip === null || vipIngame === null) {
    return NextResponse.json({ error: "Chỉ số VIP không hợp lệ" }, { status: 400 });
  }

  if (
    !status &&
    price === undefined &&
    imageUrl === undefined &&
    tag === undefined &&
    vip === undefined &&
    vipIngame === undefined
  ) {
    return NextResponse.json({ error: "Không có thay đổi" }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { code } });
  if (!product) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  await db.product.update({
    where: { code },
    data: {
      ...(status ? { status } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(vip !== undefined ? { vp: vip } : {}),
      ...(vipIngame !== undefined ? { rp: vipIngame } : {}),
    },
  });

  // Tags are rows, not a column, and the card only reads the first — so
  // "set the tag" is spelled replace-all: clear what is there, write the one
  // given. Kept outside the update above because a tag-only PATCH is the
  // common call and must not trip the "no change" guard on products.
  if (tag !== undefined) {
    await db.$transaction([
      db.productTag.deleteMany({ where: { productId: product.id } }),
      ...(tag
        ? [db.productTag.create({ data: { productId: product.id, label: tag } })]
        : []),
    ]);
  }

  return NextResponse.json({ ok: true });
}
