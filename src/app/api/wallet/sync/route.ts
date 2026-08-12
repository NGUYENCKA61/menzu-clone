import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { readTransfers } from "@/lib/topup";
import { applyTransfers } from "@/lib/topupStore";

/**
 * Pulls recent transfers from a polled provider and credits whatever matches.
 *
 * Services like api.sieuthicode.vn do not push: they expose a URL that returns
 * the last N transactions, and the shop asks. The wallet page calls this while
 * the customer waits on the transfer screen, which is what makes a top-up land
 * in seconds without anybody clicking — and without a cron server to run.
 *
 * Signed in, and rate limited by the provider call itself: this reads the
 * shop's own statement and credits only requests that already exist, so the
 * worst a signed-in caller can do is make the shop fetch its own data.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });

  const settings = await getShopSettings();
  const feeds = settings.bankAccounts.filter((account) => account.apiUrl);
  if (!settings.autoTopUpEnabled || feeds.length === 0) {
    return NextResponse.json({ matched: 0, skipped: 0, details: [], polled: false });
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
    ...report,
  });
}
