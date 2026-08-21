import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { bankReady } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { makeTopUpCode, topUpExpiresAt, transferNoteFor } from "@/lib/topup";

/**
 * Opens a top-up request. It does not add money.
 *
 * The wallet is credited when an admin confirms the transfer on the Vận hành
 * screen. Crediting here — which is what this did — meant anyone with an
 * account could type an amount and print themselves money; there is no payment
 * provider behind this endpoint to make that safe.
 *
 * The customer gets a code to put in the transfer description, which is how
 * the shop matches an incoming transfer to a pending request.
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
  if (method === "BANK" && !bankReady(settings)) {
    return NextResponse.json(
      { error: "Shop chưa cấu hình tài khoản nhận chuyển khoản" },
      { status: 503 },
    );
  }

  // No cap on how many requests can be open at once. There used to be one,
  // back when every request needed an admin to read the bank statement and two
  // pending transfers of the same amount were hard to tell apart. Each request
  // carries its own code in the transfer description, so they are told apart by
  // the code, not by being rationed.
  const topUp = await db.topUp.create({
    data: {
      code: makeTopUpCode(),
      userId: user.id,
      method,
      amount,
      status: "PENDING",
      carrier: method === "CARD" ? (body?.carrier ?? null) : null,
    },
  });

  return NextResponse.json({
    invoiceCode: topUp.code,
    amount: Number(amount),
    status: "PENDING",
    // What the customer types into the transfer description.
    transferNote: transferNoteFor(topUp.code),
    // Derived from the stored timestamp rather than the browser's clock, so
    // the countdown ends when the request actually stops being held.
    expiresAt: topUpExpiresAt(topUp.createdAt).toISOString(),
    ...(method === "BANK"
      ? {
          // Details only, never the reconciliation URL: that carries the
          // account's token and belongs on the server.
          banks: settings.bankAccounts.map((account) => ({
            code: account.code,
            name: account.name,
            account: account.account,
            holder: account.holder,
          })),
        }
      : {}),
  });
}
