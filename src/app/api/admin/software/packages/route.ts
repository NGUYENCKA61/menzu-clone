import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

/** Add a duration tier to a software product. */
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    label?: string;
    price?: number;
    durationDays?: number | null;
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

  const days = Number(body?.durationDays);
  // Sorted by price rather than by a number the admin has to keep in their
  // head: tiers are read cheapest-first everywhere they are shown, and asking
  // for a sort order as well would be two ways to say the same thing.
  const created = await db.productPackage.create({
    data: {
      productId: product.id,
      label,
      durationDays: Number.isFinite(days) && days > 0 ? Math.floor(days) : null,
      price: BigInt(Math.floor(price)),
      sortOrder: Math.floor(price),
    },
  });

  return NextResponse.json({ id: created.id });
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
