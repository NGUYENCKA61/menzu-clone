import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { readTransfers } from "@/lib/topup";
import { applyTransfers, expireStaleTopUps } from "@/lib/topupStore";

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Pulls recent transfers from a polled provider and credits whatever matches.
 *
 * Services like api.sieuthicode.vn do not push: they expose a URL that returns
 * the last N transactions, and the shop asks.
 *
 * Two callers. The wallet page calls it while a customer waits on the transfer
 * screen, which settles a top-up in seconds for somebody sitting there. A
 * scheduler calls it with the shop's key, which is what covers everybody else:
 * a customer who opens their banking app and never comes back would otherwise
 * wait until the next person happened to load the page — measured at twenty
 * minutes on this shop before the scheduled route existed.
 *
 * Either way it reads the shop's own statement and credits only requests that
 * already exist, so the worst any caller can do is make the shop fetch its own
 * data.
 */
async function runSync(request: Request) {
  const settings = await getShopSettings();

  const header =
    request.headers.get("authorization")?.replace(/^(Apikey|Bearer)\s+/i, "") ??
    request.headers.get("x-webhook-secret") ??
    new URL(request.url).searchParams.get("key") ??
    "";
  const byKey = Boolean(settings.topUpApiKey) && sameSecret(header, settings.topUpApiKey);

  if (!byKey && !(await getCurrentUser())) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }
  // Before anything else, and regardless of whether auto is on: a queue full
  // of week-old requests nobody paid is the thing an admin has to read past.
  const expired = await expireStaleTopUps();

  const feeds = settings.bankAccounts.filter((account) => account.apiUrl);
  if (!settings.autoTopUpEnabled || feeds.length === 0) {
    return NextResponse.json({ matched: 0, skipped: 0, expired, details: [], polled: false });
  }

  // Every account is read, not just the one the customer picked: people
  // transfer from whichever app is already open, and a payment that landed in
  // the other bank is still a payment.
  const transfers = (
    await Promise.all(
      feeds.map(async (account) => {
        try {
          const response = await fetch(account.apiUrl, {
            headers: settings.topUpApiKey
              ? { Authorization: `Apikey ${settings.topUpApiKey}` }
              : {},
            cache: "no-store",
            // The customer is watching a spinner; one slow provider must not
            // hold the request open, nor stop the other bank being read.
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) return [];
          return readTransfers(await response.json());
        } catch {
          return [];
        }
      }),
    )
  ).flat();

  const report = await applyTransfers(transfers, "Ngân Hàng · tự động");

  return NextResponse.json({
    polled: true,
    feeds: feeds.length,
    received: transfers.length,
    expired,
    ...report,
  });
}

export async function POST(request: Request) {
  return runSync(request);
}

/**
 * Same work under GET, because that is all a free cron service can send.
 * Safe to expose that way: it changes nothing a POST would not, and it needs
 * the shop's key or a signed-in session either way.
 */
export async function GET(request: Request) {
  return runSync(request);
}
