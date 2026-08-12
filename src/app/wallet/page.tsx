import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { WalletTopUp } from "@/components/sites/menzu-lol-f7ae197a/shared/WalletTopUp";
import { getTopUps } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { watchableTopUpCode } from "@/lib/topup";

export const metadata: Metadata = { title: "Nạp tiền" };
export const dynamic = "force-dynamic";

function formatWhen(date: Date): string {
  return date.toLocaleString("vi-VN", {
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
    getTopUps(user.id),
    getShopSettings(),
  ]);

  return (
    <AccountPageFrame
      title="Nạp tiền vào tài khoản"
      subtitle="Nạp qua ngân hàng hoặc thẻ cào, shop đối soát rồi cộng vào ví"
      crumb="Nạp tiền ví"
    >
      <WalletTopUp
        minAmount={settings.topUpMin}
        presets={settings.topUpPresets}
        bankEnabled={settings.bankTopUpEnabled}
        cardEnabled={settings.cardTopUpEnabled}
        autoEnabled={settings.autoTopUpEnabled}
        // Decided here, where createdAt is still a real date rather than the
        // display string the history rows carry.
        watchCode={watchableTopUpCode(history)}
        // Only what a customer needs to make the transfer. The reconciliation
        // URL stays on the server — it carries the account's token.
        banks={settings.bankAccounts.map((account) => ({
          code: account.code,
          name: account.name,
          account: account.account,
          holder: account.holder,
        }))}
        // Dates are formatted here, where the locale and timezone are fixed.
        // Formatting inside the client component would run once per timezone
        // and React would report the mismatch as a hydration error.
        history={history.map((row) => ({
          code: row.code,
          method: row.method,
          carrier: row.carrier,
          amount: row.amount,
          status: row.status,
          createdAt: formatWhen(row.createdAt),
        }))}
      />
    </AccountPageFrame>
  );
}
