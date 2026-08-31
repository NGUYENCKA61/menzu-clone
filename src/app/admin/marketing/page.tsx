import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminMarketing } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminMarketing";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { listCategories, listFlashSales, listProductPicks, listVouchers } from "@/lib/queries";

export const metadata: Metadata = { title: "Marketing | Quản trị" };
export const dynamic = "force-dynamic";

function formatWhen(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminMarketingPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const [vouchers, sales, categories, products] = await Promise.all([
    listVouchers(),
    listFlashSales(),
    listCategories(),
    listProductPicks(),
  ]);

  return (
    <AdminShell
      title="Marketing"
      subtitle="Voucher và flash sale"
      username={admin.username}
    >
      <AdminMarketing
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        products={products}
        vouchers={vouchers.map((v) => ({
          ...v,
          startsAt: formatWhen(v.startsAt),
          expiresAt: formatWhen(v.expiresAt),
        }))}
        sales={sales.map((s) => ({
          id: s.id,
          productCode: s.productCode,
          productRank: s.productRank,
          price: s.price,
          salePrice: s.salePrice,
          startsAt: formatWhen(s.startsAt) ?? "",
          endsAt: formatWhen(s.endsAt) ?? "",
          active: s.active,
          running: s.running,
        }))}
      />
    </AdminShell>
  );
}
