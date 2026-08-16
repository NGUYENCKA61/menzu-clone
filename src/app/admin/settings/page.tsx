import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminSettings } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSettings";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { listAdminCategories, listDocArticles } from "@/lib/queries";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = { title: "Cấu hình | Quản trị" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  // The home-page tab pins categories and guides by slug, so it needs the
  // lists to pick from rather than a free-text box.
  const [settings, categories, docs] = await Promise.all([
    getShopSettings(),
    listAdminCategories(),
    listDocArticles(),
  ]);

  return (
    <AdminShell
      title="Cấu hình"
      subtitle="Mức nạp, trạng thái bán hàng, nhận diện shop và bố cục trang chủ"
      username={admin.username}
    >
      <AdminSettings
        settings={settings}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        docs={docs.map((d) => ({ slug: d.slug, name: d.title }))}
      />
    </AdminShell>
  );
}
