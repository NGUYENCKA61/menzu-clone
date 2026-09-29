import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Receipt } from "lucide-react";

import { Breadcrumb } from "@/components/sites/menzu-lol-f7ae197a/shared/Breadcrumb";
import { TopUpInvoice } from "@/components/sites/menzu-lol-f7ae197a/shared/TopUpInvoice";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";
import { moneyStamp } from "@/lib/stamp";
import {
  cardNet,
  cardRateFor,
  topUpExpiresAt,
  transferNoteFor,
  watchableTopUp,
} from "@/lib/topup";

export const metadata: Metadata = { title: "Thanh toán hóa đơn" };
export const dynamic = "force-dynamic";

/**
 * One top-up request as an invoice — menzu's "Thanh toán hóa đơn".
 *
 * Where the form sends a customer the moment a request exists, and where its
 * row in the history leads back to, so the transfer details survive a reload.
 */
export default async function TopUpInvoicePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  // The shape makeTopUpCode mints, give or take: anything else is not a code.
  if (!/^[A-Z0-9]{4,20}$/.test(code)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/wallet/${code}`)}`);

  const [topUp, settings] = await Promise.all([
    // Scoped to its owner: somebody else's code answers 404 rather than
    // confirming it exists.
    db.topUp.findFirst({
      where: { code, userId: user.id },
      select: {
        code: true,
        method: true,
        amount: true,
        credited: true,
        status: true,
        note: true,
        carrier: true,
        cardSerial: true,
        createdAt: true,
      },
    }),
    getShopSettings(),
  ]);
  if (!topUp) notFound();

  const amount = Number(topUp.amount);
  const isCard = topUp.method === "CARD";

  // A faint grid fading down from the top, the breadcrumb pill, the title,
  // then the panels.
  return (
    <div className="relative w-full max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col min-h-screen">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
      />
      <div className="mb-4 px-2 sm:px-0 relative z-10 flex items-center justify-between">
        <Breadcrumb
          margin="mb-0"
          items={[
            { label: "Trang chủ", href: "/" },
            { label: "Nạp tiền ví", href: "/wallet" },
            { label: `Hóa đơn #${topUp.code}` },
          ]}
        />
      </div>
      {/* Titled like every other account page (the owner, 29/09: restyle to
          our site, not menzu's white-to-grey title). */}
      <div className="mb-6 px-2 sm:px-0 relative z-10">
        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider flex items-center gap-3">
          <Receipt size={24} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
          Thanh toán hóa đơn
        </h1>
      </div>

      <TopUpInvoice
        code={topUp.code}
        method={isCard ? "CARD" : "BANK"}
        amount={amount}
        credited={topUp.credited === null ? null : Number(topUp.credited)}
        status={topUp.status}
        // Only carried on a refusal: it is the desk's answer to "why".
        note={topUp.status === "FAILED" ? topUp.note : null}
        carrier={topUp.carrier}
        // Never the whole card, and never the PIN: the page may be on a
        // screen somebody else can see.
        serialTail={topUp.cardSerial ? topUp.cardSerial.slice(-4) : null}
        createdAt={moneyStamp(topUp.createdAt)}
        expiresAt={topUpExpiresAt(topUp.createdAt).toISOString()}
        // Unsettled and recent, by the same rule the wallet page watches by.
        watch={watchableTopUp([topUp]) !== null}
        transferNote={transferNoteFor(topUp.code)}
        // Only what a customer needs to make the transfer. The reconciliation
        // URL stays on the server — it carries the account's token.
        banks={settings.bankAccounts.map((account) => ({
          code: account.code,
          name: account.name,
          account: account.account,
          holder: account.holder,
        }))}
        autoEnabled={settings.autoTopUpEnabled}
        cardPercent={
          isCard ? cardRateFor(amount, settings.topUpCardRates, settings.topUpCardFee) : 0
        }
        cardCredit={
          isCard ? cardNet(amount, settings.topUpCardRates, settings.topUpCardFee) : amount
        }
      />
    </div>
  );
}
