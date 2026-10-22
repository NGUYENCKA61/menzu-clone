import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/session";
import { theSieuReEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { checkPendingCards } from "@/lib/theSieuRe";
import { readTransfers } from "@/lib/topup";
import { applyCardCredits, applyTransfers, expireStaleTopUps } from "@/lib/topupStore";

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Shortest gap between two calls out to the provider.
 *
 * Every customer sitting on the transfer screen polls this route, so without a
 * floor the provider gets one request per waiting customer per tick — twenty
 * people waiting would be two hundred calls a minute at somebody else's
 * service, for a statement that has not changed. One caller does the fetch and
 * everyone arriving inside the window is told what it found.
 */
const PROVIDER_COOLDOWN_MS = 8_000;

let lastPollAt = 0;

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
  // Two secrets open this door, and only this door. The cron key is the one
  // written into the URL an outside scheduler is given: it makes the shop read
  // its own bank feed and nothing else, so a leak of it costs a few wasted
  // requests. The API key still works, because that is what shops set up
  // before the cron key existed — but it is the key that also opens the
  // webhook, where a posted list of invented transfers becomes real money, so
  // the settings screen no longer puts it in a URL.
  const byKey =
    (Boolean(settings.topUpCronKey) && sameSecret(header, settings.topUpCronKey)) ||
    (Boolean(settings.topUpApiKey) && sameSecret(header, settings.topUpApiKey));

  if (!byKey && !(await getCurrentUser())) {
    return NextResponse.json({ error: "Bạn cần đăng nhập" }, { status: 401 });
  }
  // Before anything else, and regardless of whether auto is on: a queue full
  // of week-old requests nobody paid is the thing an admin has to read past.
  const expired = await expireStaleTopUps();

  const feeds = settings.bankAccounts.filter((account) => account.apiUrl);
  // The TheSieuRe history is read on the same pass, for scratch cards only
  // (the owner, 22/10/2026: "cái đó cho thẻ cào thôi").
  const cardFeed = settings.topUpCardFeedUrl;
  const pollFeeds = settings.autoTopUpEnabled && (feeds.length > 0 || Boolean(cardFeed));
  // Cards sent to TheSieuRe and not yet answered are asked about here too,
  // whatever the bank switch says: that is its own door, the Merchant keys.
  const askTheSieuRe = theSieuReEnabled(settings);
  if (!pollFeeds && !askTheSieuRe) {
    return NextResponse.json({ matched: 0, skipped: 0, expired, details: [], polled: false });
  }

  // Somebody asked the provider a moment ago; a bank statement does not change
  // between two callers eight seconds apart.
  // Reports zero rather than replaying what the last caller found: a client
  // that reloads on somebody else's match would reload again on the next tick,
  // and again, for as long as the window lasts. Each client watches its own
  // request through /api/wallet/status instead.
  if (Date.now() - lastPollAt < PROVIDER_COOLDOWN_MS) {
    return NextResponse.json({
      polled: false,
      cooling: true,
      expired,
      matched: 0,
      skipped: 0,
      details: [],
    });
  }
  lastPollAt = Date.now();

  /** One feed's latest rows, or nothing: the customer is watching a spinner,
   *  so one slow provider must not hold the request open, nor stop the other
   *  feeds being read. */
  const readFeed = async (url: string) => {
    try {
      const response = await fetch(url, {
        headers: settings.topUpApiKey
          ? { Authorization: `Apikey ${settings.topUpApiKey}` }
          : {},
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) return [];
      return readTransfers(await response.json());
    } catch {
      return [];
    }
  };

  // Every account is read, not just the one the customer picked: people
  // transfer from whichever app is already open, and a payment that landed in
  // the other bank is still a payment.
  const transfers = pollFeeds
    ? (await Promise.all(feeds.map((account) => readFeed(account.apiUrl)))).flat()
    : [];
  const report = pollFeeds
    ? await applyTransfers(transfers, "Ngân Hàng · tự động")
    : { matched: 0, skipped: 0, details: [] as string[] };

  const credits = pollFeeds && cardFeed ? await readFeed(cardFeed) : [];
  const cards = pollFeeds && cardFeed ? await applyCardCredits(credits) : null;
  const asked = askTheSieuRe ? await checkPendingCards(settings) : null;

  // The report is the shop's, not the caller's. Its lines name other customers
  // and the money they moved — "NTxxxx: cộng 5.000.000đ cho <tên>" — and quote
  // sixty characters of the bank statement they were read from, which is where
  // the sender's own name usually sits. Every customer waiting on a transfer
  // polls this route every ten seconds, so handing that back to a signed-in
  // caller published the shop's incoming cash to anyone who registered.
  //
  // A customer needs none of it: the wallet page throws this response away and
  // watches its own request through /api/wallet/status. The counts stay because
  // they say nothing about who, and the scheduler running on the shop's key
  // still gets the full report to log.
  return NextResponse.json({
    polled: true,
    expired,
    matched: report.matched + (cards?.matched ?? 0) + (asked?.credited ?? 0),
    skipped: report.skipped + (cards?.skipped ?? 0) + (asked?.refused ?? 0),
    ...(byKey
      ? {
          feeds: (pollFeeds ? feeds.length + (cardFeed ? 1 : 0) : 0) + (askTheSieuRe ? 1 : 0),
          received: transfers.length + credits.length + (asked?.checked ?? 0),
          details: [...report.details, ...(cards?.details ?? []), ...(asked?.details ?? [])],
        }
      : {}),
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
