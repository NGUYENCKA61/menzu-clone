import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminCrm } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminCrm";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { crmCounts, listThreadsForDesk } from "@/lib/chatStore";

export const metadata: Metadata = { title: "CRM khách hàng | Quản trị" };
export const dynamic = "force-dynamic";

/**
 * The CRM desk's page: the first paint carries the inbox and its counters so
 * the list is readable before any client fetch; everything after is the
 * client component talking to /api/admin/crm.
 */
export default async function AdminCrmPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  // Hand-offs waiting on the admin open the page already filtered to them.
  const counts = await crmCounts();
  const filter = counts.needAdmin > 0 ? ("NEED_ADMIN" as const) : ("ALL" as const);
  const threads = await listThreadsForDesk(
    filter === "ALL" ? {} : { status: filter },
  );

  return (
    <AdminShell
      title="CRM khách hàng"
      subtitle="Hội thoại từ khung chat web: bot trả lời trước, ca khó chuyển bạn"
      username={admin.username}
    >
      <AdminCrm initial={{ threads, counts, filter }} />
    </AdminShell>
  );
}
