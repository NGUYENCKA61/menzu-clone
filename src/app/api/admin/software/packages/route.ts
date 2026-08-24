import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/**
 * Tiers are read cheapest-first everywhere they are shown, so the price is the
 * order — asking the shop for a sort number as well would be two ways to say
 * the same thing. Clamped because the column is 32-bit and a price is not.
 */
function sortOrderFor(price: number): number {
  return Math.min(Math.floor(price), 2_000_000_000);
}

/** Add a duration tier to a software product. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    label?: string;
    price?: number;
    durationHours?: number | null;
  } | null;

  const code = body?.code?.trim();
  const label = body?.label?.trim();
  const price = Number(body?.price ?? 0);

  if (!code || !label) {
    return NextResponse.json({ error: "Thiếu tên gói" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: "Giá gói không hợp lệ" }, { status: 400 });
  }

  const product = await db.product.findFirst({
    where: { code, productType: "SOFTWARE_GAME" },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy phần mềm" }, { status: 404 });
  }

  // Hours, whichever unit the form offered — the conversion belongs where the
  // shop picked "giờ" or "ngày", not here.
  const hours = Number(body?.durationHours);
  const created = await db.productPackage.create({
    data: {
      productId: product.id,
      label,
      durationHours: Number.isFinite(hours) && hours > 0 ? Math.floor(hours) : null,
      price: BigInt(Math.floor(price)),
      sortOrder: sortOrderFor(price),
    },
  });

  return NextResponse.json({ id: created.id });
}

/**
 * Edit a tier in place.
 *
 * The counterpart to DELETE refusing a tier that has been bought: orders point
 * at the row, so it cannot go — and without this a mistyped name or a price
 * that has since changed would be stuck for as long as the tier sells. Editing
 * is safe where deleting is not, because the row keeps its id and every order
 * naming it goes on naming the same thing. Old orders keep their own figures
 * (listPrice, total are stored per order), so a new price only ever applies to
 * the next sale.
 */
export async function PATCH(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    label?: string;
    price?: number;
    durationHours?: number | null;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu gói" }, { status: 400 });

  const pkg = await db.productPackage.findUnique({ where: { id }, select: { id: true } });
  if (!pkg) return NextResponse.json({ error: "Không tìm thấy gói" }, { status: 404 });

  // Each field is only touched when the body carries it, so a form that edits
  // one thing cannot blank the other two.
  const label = body?.label?.trim();
  if (body?.label !== undefined && !label) {
    return NextResponse.json({ error: "Tên gói không được để trống" }, { status: 400 });
  }

  let price: number | undefined;
  if (body?.price !== undefined) {
    const value = Number(body.price);
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Giá gói không hợp lệ" }, { status: 400 });
    }
    price = Math.floor(value);
  }

  // An explicit null is the shop saying "vĩnh viễn"; leaving the field out
  // means they were editing something else.
  let durationHours: number | null | undefined;
  if (body?.durationHours !== undefined) {
    const hours = Number(body.durationHours);
    durationHours =
      body.durationHours === null || !Number.isFinite(hours) || hours <= 0
        ? null
        : Math.floor(hours);
  }

  await db.productPackage.update({
    where: { id },
    data: {
      ...(label ? { label } : {}),
      ...(price !== undefined
        ? { price: BigInt(price), sortOrder: sortOrderFor(price) }
        : {}),
      ...(durationHours !== undefined ? { durationHours } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

/** Remove a tier. */
export async function DELETE(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu gói" }, { status: 400 });

  const pkg = await db.productPackage.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!pkg) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  // Orders point at the tier to record what was sold. Deleting one that has
  // been bought would be refused by the database anyway, so the refusal is
  // given here where it can say why.
  if (pkg._count.orders > 0) {
    return NextResponse.json(
      { error: "Gói này đã có đơn hàng, không xoá được" },
      { status: 409 },
    );
  }

  await db.productPackage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
