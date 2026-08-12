import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminSettings } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSettings";
import { AdminShell } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminShell";
import { getAdmin } from "@/lib/admin";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = { title: "Cấu hình | Quản trị" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  const settings = await getShopSettings();

  return (
    <AdminShell
      title="Cấu hình"
      subtitle="Mức nạp, mệnh giá và trạng thái bán hàng của shop"
      username={admin.username}
    >
      <AdminSettings settings={settings} />
    </AdminShell>
  );
}
