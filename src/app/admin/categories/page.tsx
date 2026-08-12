import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminCategories } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminCategories";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { listAdminCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Danh mục | Quản trị" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const categories = await listAdminCategories();

  return (
    <AdminShell
      title="Danh mục"
      subtitle="Thứ tự hiển thị, đường dẫn và ảnh bìa của các danh mục ngoài trang chủ"
      username={admin.username}
    >
      <AdminCategories
        categories={categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          name: category.name,
          imageUrl: category.imageUrl,
          soldCount: category.soldCount,
          stockCount: category.stockCount,
          productCount: category.productCount,
        }))}
      />
    </AdminShell>
  );
}
