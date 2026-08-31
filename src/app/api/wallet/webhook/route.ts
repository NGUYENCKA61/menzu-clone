import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getShopSettings } from "@/lib/settingsStore";
import { readTransfers } from "@/lib/topup";
import { applyTransfers } from "@/lib/topupStore";

/** Constant-time compare so the key cannot be guessed a character at a time. */
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Where a bank-reading service posts an incoming transfer.
 *
 * This endpoint credits wallets with nobody watching, so it refuses unless
 * auto top-up is switched on *and* the caller presents the configured key.
 * Providers spell that header differently — Casso and SePay send
 * `Authorization: Apikey <key>` — so both that and a plain secret header are
 * accepted.
 *
 * Only a transfer whose description carries a pending code and whose amount
 * matches it is credited. Everything else is reported back and left for a
 * human; guessing which request a stray transfer belongs to is how money ends
 * up in the wrong wallet.
 */
export async function POST(request: Request) {
  const settings = await getShopSettings();

  if (!settings.autoTopUpEnabled || !settings.topUpApiKey) {
    return NextResponse.json({ error: "Nạp tự động đang tắt" }, { status: 503 });
  }

  // Every place the key might be, tried in turn — not the first one that
  // merely exists. A provider that sends its own Authorization header for
  // something else, alongside the secret header it was told to send, would
  // otherwise be refused on the strength of the wrong one.
  const candidates = [
    request.headers.get("authorization")?.replace(/^(Apikey|Bearer)\s+/i, ""),
    request.headers.get("x-webhook-secret"),
    request.headers.get("x-api-key"),
  ].filter((value): value is string => Boolean(value));
  if (!candidates.some((value) => sameSecret(value, settings.topUpApiKey))) {
    return NextResponse.json({ error: "Sai API key" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const transfers = readTransfers(payload);
  if (transfers.length === 0) {
    return NextResponse.json(
      { error: "Không đọc được giao dịch nào trong dữ liệu gửi lên" },
      { status: 400 },
    );
  }

  const report = await applyTransfers(transfers, "Ngân Hàng · tự động");

  // 200 even when nothing matched: the provider delivered fine, and most of
  // them retry forever on any other status.
  return NextResponse.json({ received: transfers.length, ...report });
}
