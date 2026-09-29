import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { TransactionsTable } from "@/components/sites/menzu-lol-f7ae197a/shared/TransactionsTable";
import { db } from "@/lib/db";
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

/**
 * A ledger line as the buyer reads it, written shorter than the row keeps it
 * (the shop still sees the stored words), as the owner asked on 29/09/2026:
 * a top-up reads "Nạp tiền mã NT8F3K2Q", menzu's way, rather than "Nạp tiền
 * vào ví · NT8F3K2Q", and a purchase drops its " · ưu đãi hạng Elite".
 */
function buyerLine(description: string): string {
  return description
    .replace(/^Nạp tiền vào ví · (NT[A-Z0-9]{6})/u, "Nạp tiền mã $1")
    .replace(/^Nạp thẻ cào · (NT[A-Z0-9]{6})/u, "Nạp thẻ cào mã $1")
    .replace(/\s*·\s*ưu đãi hạng [^·]*/u, "")
    .trim();
}

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Ftransactions");

  const [rows, requests] = await Promise.all([
    getTransactions(user.id),
    // Top-up requests that never reached the wallet — waiting, turned down,
    // overdue or dropped — which the ledger has no line for: a line is only
    // written when money is credited. /wallet used to list them under its
    // form; the owner moved them here on 29/09/2026 ("đem nó vào lịch sử
    // giao dịch", "thất bại cũng kể"). A credited request is already a line.
    db.topUp.findMany({
      where: { userId: user.id, status: { in: ["PENDING", "FAILED", "EXPIRED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { code: true, method: true, amount: true, status: true, carrier: true, createdAt: true },
    }),
  ]);

  // Formatted here, on the server, where the locale and timezone are fixed.
  // Formatting in the client component would run once per timezone and React
  // reports the mismatch as a hydration error.
  const lines = [
    ...rows.map((row) => {
      const topUp = row.kind === "TOPUP" ? TOPUP_CODE.exec(row.description)?.[0] : undefined;
      return {
        at: row.createdAt,
        view: {
          ...row,
          description: buyerLine(row.description),
          createdAt: moneyStamp(row.createdAt),
          day: shopDay(row.createdAt),
          // menzu's eye opens the invoice behind a top-up and the orders
          // behind a purchase; the rest have nothing further to show.
          href: topUp ? `/wallet/${topUp}` : row.kind === "PURCHASE" ? "/orders" : null,
        },
      };
    }),
    ...requests.map((request) => {
      const card = request.method === "CARD";
      return {
        at: request.createdAt,
        view: {
          code: request.code,
          kind: "TOPUP",
          // PENDING and FAILED read as the ledger's own; EXPIRED and
          // CANCELLED have pills of their own in the table.
          status: request.status,
          // The amount asked for (a card's face value): nothing moved, so
          // the table strikes or greys it and prints no balances.
          delta: Number(request.amount),
          balanceAfter: 0,
          description: card
            ? `Nạp thẻ cào mã ${request.code}${request.carrier ? ` · ${request.carrier}` : ""}`
            : `Nạp tiền mã ${request.code}`,
          method: card ? "Thẻ Cào" : "Ngân Hàng",
          createdAt: moneyStamp(request.createdAt),
          day: shopDay(request.createdAt),
          href: `/wallet/${request.code}`,
        },
      };
    }),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    // No title on the frame: menzu draws "Lịch sử giao dịch" inside the
    // ledger's own panel, as it does on /wallet.
    <AccountPageFrame crumb="Lịch sử giao dịch">
      <TransactionsTable rows={lines.map((line) => line.view)} />
    </AccountPageFrame>
  );
}
