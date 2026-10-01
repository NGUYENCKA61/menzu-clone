import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * "Nhận thông báo trạng thái" on a tool: follow or unfollow it.
 *
 * Sign-in required — a subscription is a row against the account, and the
 * notices it brings (lib/statusFollowers) are addressed to one. Idempotent both ways:
 * following twice is one row, unfollowing a tool never followed is fine.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    productCode?: string;
    /** A whole shelf at once — "Theo dõi cả danh mục" on the subscribe tab. */
    categorySlug?: string;
    subscribed?: boolean;
  } | null;

  // Every tool the shelf lists now — the same set the subscribe tab draws
  // under the category — followed or let go in one go. A tool added later is
  // not followed by this press: following is per tool, and a press is an
  // answer about the tools the reader could see.
  const categorySlug = body?.categorySlug?.trim();
  if (categorySlug && typeof body?.subscribed === "boolean") {
    const tools = await db.product.findMany({
      where: {
        productType: "SOFTWARE_GAME",
        deletedAt: null,
        status: "AVAILABLE",
        category: { slug: categorySlug },
      },
      select: { id: true },
    });
    if (tools.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy danh mục" }, { status: 404 });
    }
    const ids = tools.map((tool) => tool.id);
    if (body.subscribed) {
      await db.softwareStatusSubscription.createMany({
        data: ids.map((productId) => ({ userId: user.id, productId })),
        skipDuplicates: true,
      });
    } else {
      await db.softwareStatusSubscription.deleteMany({
        where: { userId: user.id, productId: { in: ids } },
      });
    }
    return NextResponse.json({ ok: true, subscribed: body.subscribed, tools: ids.length });
  }

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
