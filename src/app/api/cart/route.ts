import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isSalesLocked, salesLockReason } from "@/lib/softwareStatus";

const MAX_QUANTITY = 99;

const UNAUTHENTICATED = NextResponse.json(
  { error: "Bạn cần đăng nhập" },
  { status: 401 },
);

function clampQuantity(value: unknown): number {
  const n = Math.floor(Number(value ?? 1));
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, n));
}

/**
 * Stage a software tier for later checkout.
 *
 * Only software reaches the cart. An account is one of a kind, so a basket
 * holding one would either reserve it — starving every other shopper for as
 * long as a tab stayed open — or promise something that could be sold from
 * under them at checkout. Those are bought straight from their page.
 *
 * Adding the same tier twice raises the quantity rather than stacking a second
 * line, which is what the unique triple on the table is for.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    packageId?: string;
    quantity?: number;
  } | null;

  const code = body?.code?.trim();
  const packageId = body?.packageId?.trim();
  if (!code || !packageId) {
    return NextResponse.json({ error: "Thiếu sản phẩm hoặc gói" }, { status: 400 });
  }

  const product = await db.product.findFirst({
    where: { code, deletedAt: null, productType: "SOFTWARE_GAME" },
    select: { id: true, status: true, softwareStatus: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy phần mềm" }, { status: 404 });
  }
  if (product.status !== "AVAILABLE") {
    return NextResponse.json({ error: "Sản phẩm đang tạm hết hàng" }, { status: 409 });
  }
  // Same rule as the order itself: a caught or updating tool cannot even be
  // put aside.
  if (isSalesLocked(product.softwareStatus)) {
    return NextResponse.json(
      { error: `Tool này ${salesLockReason(product.softwareStatus)} — shop tạm khóa mua key` },
      { status: 409 },
    );
  }

  // Scoped to the product, so a tier id lifted from another listing cannot be
  // staged against this one and charged at that one's price.
  const pkg = await db.productPackage.findFirst({
    where: { id: packageId, productId: product.id },
    select: { id: true },
  });
  if (!pkg) {
    return NextResponse.json({ error: "Gói này không còn bán" }, { status: 409 });
  }

  const quantity = clampQuantity(body?.quantity);

  const item = await db.cartItem.upsert({
    where: {
      userId_productId_packageId: {
        userId: user.id,
        productId: product.id,
        packageId: pkg.id,
      },
    },
    create: { userId: user.id, productId: product.id, packageId: pkg.id, quantity },
    update: { quantity: { increment: quantity } },
  });

  // A second add that pushes past the ceiling is pinned to it rather than
  // refused: the shopper asked for more of something they already have, and an
  // error would leave them guessing what the cart now holds.
  if (item.quantity > MAX_QUANTITY) {
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: MAX_QUANTITY } });
  }

  const count = await db.cartItem.count({ where: { userId: user.id } });
  return NextResponse.json({ ok: true, count });
}

/** Set an exact quantity on one line. */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    quantity?: number;
  } | null;

  const id = body?.id?.trim();
  if (!id) return NextResponse.json({ error: "Thiếu dòng hàng" }, { status: 400 });

  // Scoped to the owner: an id alone must not let one shopper edit another's
  // basket.
  const existing = await db.cartItem.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });

  await db.cartItem.update({
    where: { id },
    data: { quantity: clampQuantity(body?.quantity) },
  });
  return NextResponse.json({ ok: true });
}

/** Remove one line, or the whole cart with `?all=1`. */
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return UNAUTHENTICATED;

  const params = new URL(request.url).searchParams;
  if (params.get("all") === "1") {
    const { count } = await db.cartItem.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true, removed: count });
  }

  const id = params.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu dòng hàng" }, { status: 400 });

  const { count } = await db.cartItem.deleteMany({ where: { id, userId: user.id } });
  if (count === 0) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
