import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

function count(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/** Create a category. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    slug?: string;
    imageUrl?: string;
  } | null;

  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "Thiếu tên danh mục" }, { status: 400 });

  const slug = slugify(body?.slug?.trim() || name);
  if (!slug) {
    return NextResponse.json(
      { error: "Tên danh mục phải có ít nhất một chữ hoặc số" },
      { status: 400 },
    );
  }

  const clash = await db.category.findUnique({ where: { slug } });
  if (clash) {
    return NextResponse.json(
      { error: `Đường dẫn "${slug}" đã thuộc về danh mục ${clash.name}` },
      { status: 409 },
    );
  }

  // New categories go to the end of the list rather than the front, so adding
  // one never reshuffles the home page rows the shop already arranged.
  const last = await db.category.findFirst({ orderBy: { sortOrder: "desc" } });

  const category = await db.category.create({
    data: {
      name,
      slug,
      imageUrl: body?.imageUrl?.trim() || null,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json({ id: category.id, slug: category.slug });
}

/**
 * Edit a category, or move it one place in the ordering.
 *
 * `soldCount` and `stockCount` are the two figures printed on the home page
 * card ("Đã Bán" / "Đang Bán"). They are shop-facing marketing numbers, not
 * derived from the products table, which is why they are editable here.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    action?: string;
    direction?: string;
    name?: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    soldCount?: number;
    stockCount?: number;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu danh mục" }, { status: 400 });

  const category = await db.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
  }

  // --- reorder -------------------------------------------------------------
  if (body?.action === "move") {
    const up = body?.direction !== "down";
    const neighbour = await db.category.findFirst({
      where: up
        ? { sortOrder: { lt: category.sortOrder } }
        : { sortOrder: { gt: category.sortOrder } },
      orderBy: { sortOrder: up ? "desc" : "asc" },
    });
    if (!neighbour) {
      return NextResponse.json({ error: "Đã ở đầu danh sách" }, { status: 400 });
    }

    // Two categories seeded with the same sortOrder would swap to no effect
    // and the row would never move. Fall back to a gap of one in that case.
    const mine = neighbour.sortOrder === category.sortOrder
      ? category.sortOrder + (up ? -1 : 1)
      : neighbour.sortOrder;

    await db.$transaction([
      db.category.update({ where: { id: category.id }, data: { sortOrder: mine } }),
      db.category.update({
        where: { id: neighbour.id },
        data: { sortOrder: category.sortOrder },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  // --- edit ----------------------------------------------------------------
  const name = body?.name?.trim();
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Tên danh mục không được để trống" }, { status: 400 });
  }

  let slug: string | undefined;
  if (body?.slug !== undefined) {
    slug = slugify(body.slug);
    if (!slug) {
      return NextResponse.json({ error: "Đường dẫn không hợp lệ" }, { status: 400 });
    }
    if (slug !== category.slug) {
      const clash = await db.category.findUnique({ where: { slug } });
      if (clash) {
        return NextResponse.json(
          { error: `Đường dẫn "${slug}" đã thuộc về danh mục ${clash.name}` },
          { status: 409 },
        );
      }
    }
  }

  await db.category.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(slug ? { slug } : {}),
      ...(body?.imageUrl !== undefined
        ? { imageUrl: body.imageUrl.trim() || null }
        : {}),
      // Sent as "" to clear it, which takes the line off the home page tile.
      ...(body?.description !== undefined
        ? { description: body.description.trim() || null }
        : {}),
      ...(body?.soldCount !== undefined
        ? { soldCount: count(body.soldCount, category.soldCount) }
        : {}),
      ...(body?.stockCount !== undefined
        ? { stockCount: count(body.stockCount, category.stockCount) }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

/** Delete a category. Refuses while products still point at it. */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu danh mục" }, { status: 400 });

  const category = await db.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) {
    return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
  }

  // Products require a category, so the delete would fail at the database
  // anyway — this says which category and how many, which the constraint
  // error does not.
  if (category._count.products > 0) {
    return NextResponse.json(
      {
        error:
          `Còn ${category._count.products} sản phẩm trong "${category.name}". ` +
          `Chuyển chúng sang danh mục khác trước khi xóa.`,
      },
      { status: 409 },
    );
  }

  await db.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
