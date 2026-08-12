import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminTrade } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminTrade";
import { getAdmin } from "@/lib/admin";
import { listTradeRequests } from "@/lib/queries";

export const metadata: Metadata = { title: "Thu cũ đổi mới | Quản trị" };
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

export default async function AdminTradePage() {
  const admin = await getAdmin();
  if (!admin) redirect("/login?next=%2Fadmin%2Ftrade");

  const rows = await listTradeRequests();

  return (
    <AdminShell
      title="Thu cũ đổi mới"
      subtitle="Duyệt và báo giá các đơn khách gửi lên"
      username={admin.username}
    >
      <AdminTrade
        // Formatted server-side, where the timezone is fixed; formatting in
        // the client component would render differently on each side and
        // React would report the mismatch as a hydration error.
        rows={rows.map((row) => ({ ...row, createdAt: formatWhen(row.createdAt) }))}
      />
    </AdminShell>
  );
}
