import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { bankReady } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import {
  CARD_DIGITS_MAX,
  CARD_DIGITS_MIN,
  makeTopUpCode,
  readCardDigits,
  topUpExpiresAt,
  transferNoteFor,
} from "@/lib/topup";

/**
 * How many requests one account may leave open at once.
 *
 * Five is more than anybody needs — a person transfers, waits, and is credited
 * — and few enough that no single account can bury the desk under a queue only
 * it can see past.
 */
const MAX_OPEN_REQUESTS = 5;

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
    serial?: string;
    pin?: string;
  } | null;

  const settings = await getShopSettings();

  const raw = Number(body?.amount ?? 0);
  if (!Number.isFinite(raw) || raw <= 0) {
    return NextResponse.json({ error: "Số tiền không hợp lệ" }, { status: 400 });
  }
  // A ceiling as well as a floor. Postgres BIGINT stops at about 9.2×10^18,
  // and a request for more than that reached the driver as a value it could
  // not store — a 500 and a stack in the log for what is really just a silly
  // number in a form. A hundred billion đồng is far past any real top-up.
  const MAX_TOPUP = 100_000_000_000n;
  const amount = BigInt(Math.floor(raw));
  if (amount > MAX_TOPUP) {
    return NextResponse.json(
      { error: `Số tiền nạp tối đa ${MAX_TOPUP.toLocaleString("vi-VN")}đ` },
      { status: 400 },
    );
  }
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

  // The card itself, and it must be a card: a request that names no carrier
  // or carries half a card is one nobody can redeem, and it would sit in the
  // queue looking like money that never arrives.
  let cardSerial: string | null = null;
  let cardPin: string | null = null;
  if (method === "CARD") {
    if (!body?.carrier) {
      return NextResponse.json({ error: "Chọn nhà mạng của thẻ" }, { status: 400 });
    }
    cardSerial = readCardDigits(body?.serial);
    cardPin = readCardDigits(body?.pin);
    const lengths = `${CARD_DIGITS_MIN}–${CARD_DIGITS_MAX} chữ số`;
    if (!cardSerial) {
      return NextResponse.json(
        { error: `Số seri chỉ gồm chữ số, ${lengths}` },
        { status: 400 },
      );
    }
    if (!cardPin) {
      return NextResponse.json(
        { error: `Mã thẻ chỉ gồm chữ số, ${lengths}` },
        { status: 400 },
      );
    }
  }

  // A ceiling on how many requests one account can leave open.
  //
  // Not about telling them apart — each carries its own code in the transfer
  // description, which is why the old cap went. It is about the desk: the
  // queue is the only screen that credits a bank transfer or redeems a card,
  // and an account that opens a few hundred requests pushes everybody else's
  // real ones off it. Nobody legitimately has six transfers in flight; the
  // ones already open expire on their own, so this never becomes a wall.
  const open = await db.topUp.count({
    where: { userId: user.id, status: "PENDING" },
  });
  if (open >= MAX_OPEN_REQUESTS) {
    return NextResponse.json(
      {
        error: `Bạn đang có ${open} lệnh nạp chưa hoàn tất. Hoàn tất hoặc huỷ bớt rồi tạo lệnh mới.`,
      },
      { status: 429 },
    );
  }

  const topUp = await db.topUp.create({
    data: {
      code: makeTopUpCode(),
      userId: user.id,
      method,
      amount,
      status: "PENDING",
      carrier: method === "CARD" ? (body?.carrier ?? null) : null,
      cardSerial,
      cardPin,
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
