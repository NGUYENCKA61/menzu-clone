import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * "Nhận thông báo trạng thái" on a tool: follow or unfollow it.
 *
 * Sign-in required — a subscription is a row against the account, and the
 * bell it feeds only exists for someone signed in. Idempotent both ways:
 * following twice is one row, unfollowing a tool never followed is fine.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    productCode?: string;
    subscribed?: boolean;
  } | null;

  const productCode = body?.productCode?.trim();
  if (!productCode || typeof body?.subscribed !== "boolean") {
    return NextResponse.json({ error: "Thiếu sản phẩm" }, { status: 400 });
  }

  const product = await db.product.findFirst({
    where: { code: productCode, productType: "SOFTWARE_GAME", deletedAt: null },
    select: { id: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Không tìm thấy tool" }, { status: 404 });
  }

  const key = { userId: user.id, productId: product.id };
  if (body.subscribed) {
    await db.softwareStatusSubscription.upsert({
      where: { userId_productId: key },
      create: key,
      update: {},
    });
  } else {
    await db.softwareStatusSubscription.deleteMany({ where: key });
  }

  return NextResponse.json({ ok: true, subscribed: body.subscribed });
}
