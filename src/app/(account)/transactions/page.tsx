import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { TransactionsTable } from "@/components/sites/menzu-lol-f7ae197a/shared/TransactionsTable";
import { getTransactions } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { moneyStamp, shopDay } from "@/lib/stamp";

export const metadata: Metadata = {
  title: "Lịch sử giao dịch",
  // Nothing here belongs in a search index: it is either a sign-in step or
  // one visitor's own account. Followed, not indexed, so the links still
  // pass through.
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

/** The request code a top-up line carries ("Nạp tiền vào ví · NT8F3K2Q"). */
const TOPUP_CODE = /\bNT[A-Z0-9]{6}\b/;

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Ftransactions");

  const rows = await getTransactions(user.id);

  return (
    // No title on the frame: menzu draws "Lịch sử giao dịch" inside the
    // ledger's own panel, as it does on /wallet.
    <AccountPageFrame crumb="Lịch sử giao dịch">
      <TransactionsTable
        // Formatted here, on the server, where the locale and timezone are
        // fixed. Formatting in the client component would run once per
        // timezone and React reports the mismatch as a hydration error.
        rows={rows.map((row) => {
          const topUp = row.kind === "TOPUP" ? TOPUP_CODE.exec(row.description)?.[0] : undefined;
          return {
            ...row,
            createdAt: moneyStamp(row.createdAt),
            day: shopDay(row.createdAt),
            // menzu's eye opens the invoice behind a top-up and the orders
            // behind a purchase; the rest have nothing further to show.
            href: topUp ? `/wallet/${topUp}` : row.kind === "PURCHASE" ? "/orders" : null,
          };
        })}
      />
    </AccountPageFrame>
  );
}
