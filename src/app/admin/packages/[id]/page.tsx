import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminPackageDetail } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminPackageDetail";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { readKeyStore } from "@/lib/packageKeyStore";

export const metadata: Metadata = { title: "Chi tiết gói | Quản trị" };
export const dynamic = "force-dynamic";

/**
 * One duration tier's own desk: facts, numbers, and the key store at full
 * width. Addressed by the tier's id — tiers have no slug, and the id is what
 * every row on the product page already has in hand.
 */
export default async function AdminPackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 does not tell an unauthenticated visitor
  // that an admin area exists here at all.
  if (!admin) notFound();

  const { id } = await params;
  const pkg = await db.productPackage.findUnique({
    where: { id },
    include: {
      product: { select: { code: true, name: true } },
      _count: { select: { orders: true } },
    },
  });
  if (!pkg) notFound();

  const keys = await readKeyStore(pkg.id);

  return (
    <AdminShell
      title={`${pkg.product.name ?? pkg.product.code} — gói ${pkg.label}`}
      subtitle="Chi tiết gói thời hạn — giá, thời hạn và kho key"
      username={admin.username}
      aside={
        <Link
          href={`/admin/products/${encodeURIComponent(pkg.product.code)}`}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          {pkg.product.name ?? pkg.product.code}
        </Link>
      }
    >
      <AdminPackageDetail
        pkg={{
          id: pkg.id,
          label: pkg.label,
          price: Number(pkg.price),
          durationHours: pkg.durationHours,
          orderCount: pkg._count.orders,
          keys,
        }}
      />
    </AdminShell>
  );
}
