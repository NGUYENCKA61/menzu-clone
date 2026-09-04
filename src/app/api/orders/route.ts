import { NextResponse } from "next/server";

import { currentOrderIdOf, loginHandover, tagOf } from "@/lib/accountLogin";
import { checkoutFailure, placeOrder } from "@/lib/checkout";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Buy an account or a tool from the web.
 *
 * The sale itself lives in lib/checkout so the Telegram shop bot sells off the
 * same shelf with the same rules; this route only reads the request, names
 * the buyer and shapes the answer.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để mua tài khoản" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    code?: string;
    voucher?: string;
    packageId?: string;
    quantity?: number;
  } | null;
  const code = body?.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Thiếu mã tài khoản" }, { status: 400 });
  }

  try {
    const result = await placeOrder({
      userId: user.id,
      code,
      packageId: body?.packageId?.trim() || null,
      quantity: body?.quantity,
      voucher: body?.voucher?.trim() || null,
    });
    return NextResponse.json({
      orderCode: result.orderCode,
      total: Number(result.total),
      balance: Number(result.balanceAfter),
      tierCut: Number(result.tierCut),
      ...(result.isSoftware
        ? { keysDelivered: result.delivered, keysPending: result.quantity - result.delivered }
        : result.isPool
          ? { accountsDelivered: result.delivered }
          : { loginReady: result.loginReady }),
    });
  } catch (error) {
    const { status, ...failure } = checkoutFailure(error);
    return NextResponse.json(failure, { status });
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ items: [] }, { status: 401 });

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          code: true,
          imageUrl: true,
          rank: true,
          productType: true,
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

  return NextResponse.json({
    items: orders.map((o) => ({
      code: o.code,
      status: o.status,
      total: Number(o.total),
      createdAt: o.createdAt.toISOString(),
      product: { code: o.product.code, imageUrl: o.product.imageUrl, rank: o.product.rank },
      // The buyer's own orders only, and nothing unless the order is PAID and
      // still the latest sale of that account — the same gate the page applies.
      login: loginHandover(o, {
        ...o.product,
        currentOrderId: currentOrderIdOf(o.product),
        tag: tagOf(o.product),
      }),
    })),
  });
}
