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
  if (!settings.autoTopUpEnabled || !settings.topUpApiUrl) {
    return NextResponse.json({ matched: 0, skipped: 0, details: [], polled: false });
  }

  let payload: unknown = null;
  try {
    const response = await fetch(settings.topUpApiUrl, {
      headers: settings.topUpApiKey
        ? { Authorization: `Apikey ${settings.topUpApiKey}` }
        : {},
      cache: "no-store",
      // The customer is watching a spinner; a provider having a slow day must
      // not hold the request open indefinitely.
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Nhà cung cấp trả về ${response.status}`, matched: 0 },
        { status: 502 },
      );
    }
    payload = await response.json();
  } catch {
    return NextResponse.json(
      { error: "Không gọi được API đối soát", matched: 0 },
      { status: 502 },
    );
  }

  const transfers = readTransfers(payload);
  const report = await applyTransfers(transfers, "Ngân Hàng · tự động");

  return NextResponse.json({ polled: true, received: transfers.length, ...report });
}
