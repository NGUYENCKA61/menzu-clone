import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";

function makeCode(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Creates a top-up invoice and credits the wallet.
 *
 * A real deployment settles this against a payment provider webhook; there is
 * no provider here, so the invoice completes immediately. The ledger entry and
 * the balance change are written together so they can never disagree.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    amount?: number;
    method?: string;
    carrier?: string;
  } | null;

  const settings = await getShopSettings();

  const raw = Number(body?.amount ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) {
    return NextResponse.json({ error: "Số tiền không hợp lệ" }, { status: 400 });
  }
  const amount = BigInt(Math.floor(raw));
  if (amount < BigInt(settings.topUpMin)) {
    return NextResponse.json(
      { error: `Nạp từ ${settings.topUpMin.toLocaleString("vi-VN")}đ trở lên` },
      { status: 400 },
    );
  }

  const method = body?.method === "CARD" ? "CARD" : "BANK";

  // Checked on the server as well as hidden in the UI: a disabled method is a
  // business decision, and a form posted from a stale tab must not slip past
  // it.
  if (method === "CARD" && !settings.cardTopUpEnabled) {
    return NextResponse.json(
      { error: "Shop đang tạm ngưng nhận nạp bằng thẻ cào" },
      { status: 400 },
    );
  }
  if (method === "BANK" && !settings.bankTopUpEnabled) {
    return NextResponse.json(
      { error: "Shop đang tạm ngưng nhận nạp qua ngân hàng" },
      { status: 400 },
    );
  }

  const result = await db.$transaction(async (tx) => {
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    const balanceAfter = current.balance + amount;

    await tx.user.update({
      where: { id: user.id },
      data: { balance: balanceAfter },
    });

    const topUp = await tx.topUp.create({
      data: {
        code: makeCode("NT"),
        userId: user.id,
        method,
        amount,
        status: "COMPLETED",
        carrier: method === "CARD" ? (body?.carrier ?? null) : null,
      },
    });

    await tx.transaction.create({
      data: {
        code: makeCode("GD"),
        userId: user.id,
        kind: "TOPUP",
        status: "SUCCESS",
        delta: amount,
        balanceAfter,
        description: "Nạp tiền vào ví",
        method: method === "CARD" ? "Thẻ Cào" : "Ngân Hàng",
      },
    });

    return { topUp, balanceAfter };
  });

  return NextResponse.json({
    invoiceCode: result.topUp.code,
    amount: Number(amount),
    balance: Number(result.balanceAfter),
  });
}
