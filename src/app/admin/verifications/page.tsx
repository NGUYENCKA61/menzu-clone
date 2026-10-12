import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminVerifications } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminVerifications";
import { getAdmin } from "@/lib/admin";
import { adminVerificationRows } from "@/lib/verification";

export const metadata: Metadata = { title: "Xác thực cấp 2 | Quản trị" };
export const dynamic = "force-dynamic";

/**
 * The desk for "xác thực cấp 2" (the owner, 12/10/2026): every bid a
 * customer sent from Bảo mật, the waiting ones first, decided here.
 */
export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 tells nobody that an admin area is here.
  if (!admin) notFound();

  const rows = await adminVerificationRows();
  return (
    <AdminShell
      title="Xác thực cấp 2"
      subtitle="Hồ sơ khách gửi để lên cấp 2: đối chiếu Facebook, Zalo, số điện thoại và tài khoản ngân hàng rồi duyệt"
      username={admin.username}
    >
      <AdminVerifications
        rows={rows}
        initialFilter={filter === "all" ? "ALL" : "PENDING"}
      />
    </AdminShell>
  );
}
