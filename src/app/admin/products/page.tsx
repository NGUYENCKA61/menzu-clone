import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminProducts } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminProducts";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Menzu Admin | Sản phẩm" };
export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const admin = await getAdmin();
  if (!admin) notFound();

  const [rows, categories] = await Promise.all([
    db.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        category: { select: { name: true } },
        _count: { select: { orders: true } },
      },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <AdminShell
      title="Sản phẩm"
      subtitle="Thêm, đổi giá, đổi trạng thái hoặc xoá tài khoản"
      username={admin.username}
    >
      <AdminProducts
        products={rows.map((p) => ({
          code: p.code,
          rank: p.rank,
          status: p.status,
          price: Number(p.price),
          oldPrice: Number(p.oldPrice),
          categoryName: p.category.name,
          orderCount: p._count.orders,
        }))}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
      />
    </AdminShell>
  );
}
