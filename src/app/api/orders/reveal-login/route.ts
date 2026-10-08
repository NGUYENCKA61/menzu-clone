import { NextResponse } from "next/server";

import { currentOrderIdOf, loginHandover, tagOf } from "@/lib/accountLogin";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * The receipt's "Lấy thông tin": a buyer who has confirmed they are recording
 * the screen takes their account's sign-in (the owner, 08/10/2026, after
 * menzu's "Nhận thông tin đăng nhập"). Stamps the moment they first did, which
 * the shop reads on a warranty claim, and changes nothing after that. The
 * receipt then refreshes and draws the sign-in the page now carries.
 *
 * Only the buyer's own paid account order, and only one with something to
 * hand over: a random listing's delivered accounts, or an account's own
 * sign-in that the shop delivers automatically.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    /** The switch in the popup: "I am recording the screen". */
    recording?: boolean;
  } | null;
  const code = body?.code?.trim();
  if (!code) return NextResponse.json({ error: "Thiếu mã đơn" }, { status: 400 });
  if (body?.recording !== true) {
    return NextResponse.json({ error: "Hãy xác nhận đang quay màn hình" }, { status: 400 });
  }

  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    select: {
      id: true,
      status: true,
      loginRevealedAt: true,
      _count: { select: { licenseKeys: true } },
      product: {
        select: {
          productType: true,
          accountPool: true,
          loginUsername: true,
          loginPassword: true,
          loginNote: true,
          orders: {
            where: { status: "PAID" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true },
          },
          tags: { select: { label: true }, take: 1 },
        },
      },
    },
  });
  if (!order) return NextResponse.json({ error: "Không tìm thấy đơn" }, { status: 404 });

  const handover = loginHandover(order, {
    ...order.product,
    currentOrderId: currentOrderIdOf(order.product),
    tag: tagOf(order.product),
  });
  const somethingToTake =
    order.status === "PAID" &&
    order.product.productType === "ACCOUNT_GAME" &&
    (order.product.accountPool ? order._count.licenseKeys > 0 : handover.state === "ready");
  if (!somethingToTake) {
    return NextResponse.json(
      { error: "Đơn này không có thông tin đăng nhập để nhận" },
      { status: 409 },
    );
  }

  // The first take is the one that counts; a second press, or two tabs at
  // once, keeps the earlier stamp.
  if (order.loginRevealedAt === null) {
    await db.order.updateMany({
      where: { id: order.id, loginRevealedAt: null },
      data: { loginRevealedAt: new Date() },
    });
  }
  const after = await db.order.findUnique({
    where: { id: order.id },
    select: { loginRevealedAt: true },
  });
  return NextResponse.json({ ok: true, revealedAt: after?.loginRevealedAt?.toISOString() ?? null });
}
