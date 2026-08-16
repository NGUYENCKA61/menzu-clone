import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";

/**
 * Groups — the rows of category tiles on the home page.
 *
 * Nothing here writes to the categories table. A group is a name and a list of
 * links; adding a category to a second group inserts one row in
 * group_categories, and the category keeps its single record, its single
 * product list and its single URL.
 */

/** Create a group. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    name?: string;
  } | null;

  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "Thiếu tên nhóm" }, { status: 400 });

  const slug = slugify(name);
  if (!slug) {
    return NextResponse.json(
      { error: "Tên nhóm phải có ít nhất một chữ hoặc số" },
      { status: 400 },
    );
  }

  const clash = await db.group.findUnique({ where: { slug } });
  if (clash) {
    return NextResponse.json({ error: `Đã có nhóm tên ${clash.name}` }, { status: 409 });
  }

  // New groups go to the end, where they are visible without displacing
  // anything the shop has already arranged.
  const last = await db.group.findFirst({ orderBy: { sortOrder: "desc" } });
  const group = await db.group.create({
    data: {
      slug,
      name,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ id: group.id });
}

/** Rename a group, move it, switch it, or change which categories it shows. */
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    name?: string;
    isActive?: boolean;
    sortOrder?: number;
    categoryIds?: string[];
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu nhóm cần sửa" }, { status: 400 });

  const group = await db.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Không tìm thấy nhóm" }, { status: 404 });

  const name = body?.name?.trim();
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Tên nhóm không được để trống" }, { status: 400 });
  }

  await db.group.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      ...(typeof body?.isActive === "boolean" ? { isActive: body.isActive } : {}),
      ...(Number.isFinite(body?.sortOrder) ? { sortOrder: Math.floor(body!.sortOrder!) } : {}),
    },
  });

  if (Array.isArray(body?.categoryIds)) {
    const wanted = body.categoryIds.map((value) => String(value)).filter(Boolean);
    // Only ids that name a real category, so a stale id from an open tab
    // cannot write a link to nothing.
    const real = await db.category.findMany({
      where: { id: { in: wanted } },
      select: { id: true },
    });
    const keep = new Set(real.map((row) => row.id));
    const ordered = wanted.filter((categoryId) => keep.has(categoryId));

    // Reconcile rather than delete-all-and-reinsert: the links that stay keep
    // their rows, and only the difference is written.
    await db.groupCategory.deleteMany({
      where: { groupId: id, categoryId: { notIn: ordered.length > 0 ? ordered : ["-"] } },
    });
    for (const [index, categoryId] of ordered.entries()) {
      await db.groupCategory.upsert({
        where: { groupId_categoryId: { groupId: id, categoryId } },
        create: { groupId: id, categoryId, sortOrder: index },
        update: { sortOrder: index },
      });
    }
  }

  return NextResponse.json({ ok: true });
}

/** Delete a group. Its links go; the categories stay. */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu nhóm cần xóa" }, { status: 400 });

  // group_categories cascades from the group. Nothing cascades to a category:
  // a category in no group is simply a category the home page does not show.
  await db.group.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
