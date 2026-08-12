import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AccountPageFrame } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountPageFrame";
import { TransactionsTable } from "@/components/sites/menzu-lol-f7ae197a/shared/TransactionsTable";
import { getTransactions } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Lịch sử giao dịch" };
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

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Ftransactions");

  const rows = await getTransactions(user.id);

  return (
    <AccountPageFrame
      title="Lịch sử giao dịch"
      subtitle="Tra cứu dòng tiền chi tiêu và nạp"
      crumb="Lịch sử giao dịch"
    >
      <TransactionsTable
        // Formatted here, on the server, where the locale is fixed. Passing
        // Date objects into a client component would format twice — once per
        // timezone — and React reports the mismatch as a hydration error.
        rows={rows.map((row) => ({ ...row, createdAt: formatWhen(row.createdAt) }))}
      />
    </AccountPageFrame>
  );
}
