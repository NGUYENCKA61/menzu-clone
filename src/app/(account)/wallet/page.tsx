import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { WalletTopUp } from "@/components/sites/menzu-lol-f7ae197a/shared/WalletTopUp";
import { getTopUps } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { bankReady } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";
import { stillHeld, topUpExpiresAt, watchableTopUp } from "@/lib/topup";

export const metadata: Metadata = { title: "Nạp tiền" };
export const dynamic = "force-dynamic";

function formatWhen(date: Date): string {
  return date.toLocaleString("vi-VN", {
    // The shop clock, not the servers: the container runs on UTC, and a
    // request made at 20:38 in Sài Gòn printed 13:38 on live.
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fwallet");

  const [history, settings] = await Promise.all([
    // No list is drawn from these any more (the history lives on
    // /transactions); the strips above the forms read the waiting ones out of
    // them, and watchableTopUp picks the one to poll.
    getTopUps(user.id, 50),
    getShopSettings(),
  ]);

  return (
    // No title on the frame: menzu draws "Nạp tiền vào tài khoản" inside the
    // desk's own panel, and WalletTopUp does the same.
    <AccountPageFrame crumb="Nạp tiền ví">
      <WalletTopUp
        minAmount={settings.topUpMin}
        presets={settings.topUpPresets}
        cardPresets={settings.topUpCardPresets}
        cardRates={settings.topUpCardRates}
        cardFee={settings.topUpCardFee}
        bankEnabled={settings.bankTopUpEnabled}
        cardEnabled={settings.cardTopUpEnabled}
        bankReady={bankReady(settings)}
        autoEnabled={settings.autoTopUpEnabled}
        // Decided here, where createdAt is still a real date rather than the
        // display string the history rows carry.
        watch={(() => {
          const row = watchableTopUp(history);
          return row ? { code: row.code, expiresAt: row.expiresAt.toISOString() } : null;
        })()}
        // Dates are formatted here, where the locale and timezone are fixed.
        // Formatting inside the client component would run once per timezone
        // and React would report the mismatch as a hydration error.
        history={history.map((row) => ({
          code: row.code,
          method: row.method,
          carrier: row.carrier,
          amount: row.amount,
          credited: row.credited,
          // A request past its hold window reads as overdue even before a
          // reconciliation pass marks it so: it no longer blocks a new
          // invoice (openBankTopUp decides the same on the server).
          status: row.status === "PENDING" && !stillHeld(row.createdAt) ? "EXPIRED" : row.status,
          // Only carried on a refusal: it is the desk's answer to "why", and
          // on any other row there is no question being asked.
          note: row.status === "FAILED" ? row.note : null,
          createdAt: formatWhen(row.createdAt),
          // Only a request still waiting has time left to count down. An ISO
          // string rather than a number of seconds, because the page may sit
          // in a cache for a while before anyone reads it.
          expiresAt:
            row.status === "PENDING" ? topUpExpiresAt(row.createdAt).toISOString() : null,
        }))}
      />
    </AccountPageFrame>
  );
}
