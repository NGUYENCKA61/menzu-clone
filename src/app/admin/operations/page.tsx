import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminOperations } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminOperations";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { listFeedback, listServiceOrders, listTopUps } from "@/lib/queries";

export const metadata: Metadata = { title: "Vận hành | Quản trị" };
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

export default async function AdminOperationsPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const [feedback, serviceOrders, topUps] = await Promise.all([
    listFeedback(),
    listServiceOrders(),
    listTopUps(),
  ]);

  return (
    <AdminShell
      title="Vận hành"
      subtitle="Đánh giá khách hàng, đơn dịch vụ và lịch sử nạp tiền"
      username={admin.username}
    >
      <AdminOperations
        // All three lists format their dates here, where the timezone is
        // fixed — doing it inside the client component would render one value
        // on the server and another in the browser.
        feedback={feedback.map((f) => ({ ...f, createdAt: formatWhen(f.createdAt) }))}
        serviceOrders={serviceOrders.map((s) => ({ ...s, createdAt: formatWhen(s.createdAt) }))}
        topUps={topUps.map((t) => ({ ...t, createdAt: formatWhen(t.createdAt) }))}
      />
    </AdminShell>
  );
}
