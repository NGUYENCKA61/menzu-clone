import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/** Add a partner to the home-page strip. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    tagline?: string;
    logoUrl?: string;
    url?: string;
  } | null;

  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "Thiếu tên đối tác" }, { status: 400 });

  const last = await db.partner.findFirst({ orderBy: { sortOrder: "desc" } });
  const created = await db.partner.create({
    data: {
      name,
      tagline: body?.tagline?.trim() || null,
      logoUrl: body?.logoUrl?.trim() || null,
      url: body?.url?.trim() || null,
      // New partners join at the end, disturbing nothing already arranged.
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json({ id: created.id });
}

/** Edit a partner, or move it one place in the strip. */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    action?: string;
    direction?: string;
    name?: string;
    tagline?: string;
    logoUrl?: string;
    url?: string;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu đối tác" }, { status: 400 });

  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  if (body?.action === "move") {
    const up = body?.direction === "up";
    // The neighbour in that direction; swapping sortOrder with it moves the
    // row one place, and the ends simply have no neighbour to swap with.
    const neighbour = await db.partner.findFirst({
      where: up
        ? { sortOrder: { lt: partner.sortOrder } }
        : { sortOrder: { gt: partner.sortOrder } },
      orderBy: { sortOrder: up ? "desc" : "asc" },
    });
    if (!neighbour) return NextResponse.json({ ok: true });

    await db.$transaction([
      db.partner.update({ where: { id }, data: { sortOrder: neighbour.sortOrder } }),
      db.partner.update({
        where: { id: neighbour.id },
        data: { sortOrder: partner.sortOrder },
      }),
    ]);
    return NextResponse.json({ ok: true });
  }

  const name = body?.name?.trim();
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Tên không được để trống" }, { status: 400 });
  }

  await db.partner.update({
    where: { id },
    data: {
      ...(name ? { name } : {}),
      // Sent as "" to clear — dropping the logo falls the tile back to text,
      // dropping the url makes it a plain tile.
      ...(body?.tagline !== undefined ? { tagline: body.tagline.trim() || null } : {}),
      ...(body?.logoUrl !== undefined ? { logoUrl: body.logoUrl.trim() || null } : {}),
      ...(body?.url !== undefined ? { url: body.url.trim() || null } : {}),
    },
  });
  return NextResponse.json({ ok: true });
}

/** Remove a partner. Plain delete — nothing else references these rows. */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu đối tác" }, { status: 400 });

  const { count } = await db.partner.deleteMany({ where: { id } });
  if (count === 0) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
