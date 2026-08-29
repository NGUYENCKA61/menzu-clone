import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminSoftwarePackages } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSoftwarePackages";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { readKeyStore } from "@/lib/packageKeyStore";

export const metadata: Metadata = { title: "Gói thời hạn | Quản trị" };
export const dynamic = "force-dynamic";

function decodeCode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * One tool's tier shelf, as its own page — the tiers and nothing else. Where
 * the list's "Quản lý gói" button lands; each row steps into the tier's own
 * desk for keys and edits.
 */
export default async function AdminSoftwarePackagesPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const admin = await getAdmin();
  // notFound, not a redirect: a 404 does not tell an unauthenticated visitor
  // that an admin area exists here at all.
  if (!admin) notFound();

  const code = decodeCode((await params).code);
  const software = await db.product.findFirst({
    where: { code, deletedAt: null, productType: "SOFTWARE_GAME" },
    select: {
      code: true,
      name: true,
      packages: {
        orderBy: { price: "asc" },
        include: { _count: { select: { orders: true } } },
      },
    },
  });
  if (!software) notFound();

  // Only the two figures the rows print; the full store loads on the tier's
  // own page, where it is actually read.
  const keyStores = await Promise.all(
    software.packages.map((p) => readKeyStore(p.id)),
  );

  return (
    <AdminShell
      title={`Gói thời hạn — ${software.name ?? software.code}`}
      subtitle="Thêm gói, xem tồn key và mở chi tiết từng gói"
      username={admin.username}
      aside={
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-neutral-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Danh sách sản phẩm
        </Link>
      }
    >
      <AdminSoftwarePackages
        code={software.code}
        packages={software.packages.map((p, index) => ({
          id: p.id,
          label: p.label,
          price: Number(p.price),
          durationHours: p.durationHours,
          orderCount: p._count.orders,
          keysAvailable: keyStores[index]!.available,
          keysPending: keyStores[index]!.pending,
        }))}
      />
    </AdminShell>
  );
}
