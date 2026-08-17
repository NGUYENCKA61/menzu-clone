import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminCategories } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminCategories";
import { AdminProducts } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminProducts";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { AdminSoftware } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSoftware";
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

  const [rows, removed, softwareRows, categories] = await Promise.all([
    db.product.findMany({
      where: { deletedAt: null, productType: "ACCOUNT_GAME" },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        category: { select: { name: true } },
        _count: { select: { orders: true } },
        // Ordered by id, which rises with insertion, so the editor hands the
        // list back in the order it was saved — the storefront card reads the
        // same order, and a shop that put its best weapon first should see that
        // choice survive a round trip.
        skins: {
          where: { kind: "WEAPON_SKIN" },
          select: { name: true },
          orderBy: { id: "asc" },
        },
      },
    }),
    // Removed products, newest removal first. Fetched separately rather than
    // filtered out of the list above, because they are shown in their own
    // section: mixing them into the table would put rows there that most of
    // its controls do not apply to.
    db.product.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
      take: 50,
      include: {
        category: { select: { name: true } },
        _count: { select: { orders: true } },
      },
    }),
    db.product.findMany({
      where: { deletedAt: null, productType: "SOFTWARE_GAME" },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { name: true } },
        packages: {
          orderBy: { price: "asc" },
          include: { _count: { select: { orders: true } } },
        },
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
              Thêm tài khoản mới, đổi giá, đổi trạng thái hoặc xoá. Tài khoản đã
              bán được giữ lại để lịch sử đơn hàng không mất, và khôi phục được.
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
              skinNames: p.skins.map((s) => s.name),
            }))}
            removed={removed.map((p) => ({
              code: p.code,
              rank: p.rank,
              categoryName: p.category.name,
              orderCount: p._count.orders,
              // Formatted here, where the timezone is fixed — the same reason
              // every other admin screen formats its dates on the server.
              deletedLabel: p.deletedAt!.toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              }),
            }))}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className={SECTION_TITLE}>3 · Phần mềm</h2>
            <p className={SECTION_NOTE}>
              Cùng bảng sản phẩm với tài khoản, chỉ khác loại. Mỗi phần mềm bán
              theo gói thời hạn — thêm gói ở ngay dưới từng sản phẩm.
            </p>
          </div>
          <AdminSoftware
            software={softwareRows.map((s) => ({
              code: s.code,
              name: s.name ?? s.code,
              categoryName: s.category.name,
              softwareStatus: s.softwareStatus,
              status: s.status,
              price: Number(s.price),
              description: s.description ?? "",
              downloadUrl: s.downloadUrl ?? "",
              videoUrl: s.videoUrl ?? "",
              version: s.version ?? "",
              platform: s.platform ?? "",
              packages: s.packages.map((p) => ({
                id: p.id,
                label: p.label,
                price: Number(p.price),
                durationDays: p.durationDays,
                orderCount: p._count.orders,
              })),
            }))}
            categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
          />
        </section>
      </div>
    </AdminShell>
  );
}
