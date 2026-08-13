import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminGroups } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminGroups";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { listAdminGroups } from "@/lib/queries";
import { listAdminCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Nhóm danh mục | Quản trị" };
export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const [groups, categories] = await Promise.all([listAdminGroups(), listAdminCategories()]);

  return (
    <AdminShell
      title="Nhóm danh mục"
      subtitle="Các hàng danh mục trên trang chủ. Một danh mục nằm được trong nhiều nhóm mà vẫn chỉ là một bản ghi."
      username={admin.username}
    >
      <AdminGroups
        groups={groups}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          productCount: c.productCount,
        }))}
      />
    </AdminShell>
  );
}
