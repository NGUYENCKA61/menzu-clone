import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminVouchers } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminVouchers";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Menzu Admin | Voucher" };
export const dynamic = "force-dynamic";

export default async function AdminVouchersPage() {
  const admin = await getAdmin();
  if (!admin) notFound();

  const rows = await db.voucher.findMany({ orderBy: { code: "asc" } });

  return (
    <AdminShell
      title="Voucher"
      subtitle="Mã giảm giá áp dụng ở bước thanh toán"
      username={admin.username}
    >
      <AdminVouchers
        vouchers={rows.map((v) => ({
          code: v.code,
          percentOff: v.percentOff,
          amountOff: v.amountOff !== null ? Number(v.amountOff) : null,
          maxUses: v.maxUses,
          usedCount: v.usedCount,
          active: v.active,
          expiresAt: v.expiresAt ? v.expiresAt.toISOString() : null,
        }))}
      />
    </AdminShell>
  );
}
