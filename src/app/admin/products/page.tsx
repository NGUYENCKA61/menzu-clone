import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminCategories } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminCategories";
import { AdminProducts } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminProducts";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { listAdminCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Menzu Admin | Sản phẩm" };
export const dynamic = "force-dynamic";

const SECTION_TITLE = "text-sm font-black uppercase tracking-widest text-white";
const SECTION_NOTE = "text-xs text-neutral-400 mt-1";

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
    listAdminCategories(),
  ]);

  return (
    <AdminShell
      title="Sản phẩm"
      subtitle="Danh mục và tài khoản đang bán, quản lý trên cùng một trang"
      username={admin.username}
    >
      <div className="flex flex-col gap-10">
        {/* Categories come first: a product cannot exist without one, so the
            screen reads in the order the work actually happens. */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className={SECTION_TITLE}>1 · Danh mục</h2>
            <p className={SECTION_NOTE}>
              Thêm danh mục mới, sửa tên và đường dẫn, đổi thứ tự hiển thị ngoài
              trang chủ, hoặc xóa danh mục không còn dùng.
            </p>
          </div>
          <AdminCategories categories={categories} />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className={SECTION_TITLE}>2 · Sản phẩm</h2>
            <p className={SECTION_NOTE}>
              Thêm tài khoản mới, đổi giá, đổi trạng thái hoặc xoá.
            </p>
          </div>
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
        </section>
      </div>
    </AdminShell>
  );
}
