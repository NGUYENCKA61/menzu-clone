import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminSettings } from "@/components/sites/menzu-lol-f7ae197a/shared/AdminSettings";
import { AdminChrome } from "@/components/sites/menzu-lol-f7ae197a/admin/AdminChrome";
import { getAdmin } from "@/lib/admin";
import {
  getPartners,
  listAdminCategories,
  listDocArticles,
} from "@/lib/queries";
import { db } from "@/lib/db";
import { getShopSettings } from "@/lib/settingsStore";
import { readZaloBotState, settleZaloBotState, ZALO_STATE_KEY } from "@/lib/zaloShared";

export const metadata: Metadata = { title: "Cấu hình | Quản trị" };
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdmin();
  // notFound, not a redirect to /login: a 404 does not tell an unauthenticated
  // visitor that an admin area exists here at all.
  if (!admin) notFound();

  // The home-page tab pins categories and guides by slug, so it needs the
  // lists to pick from rather than a free-text box.
  const [settings, categories, docs, partners, zaloStateRow, zaloGroupEvents] =
    await Promise.all([
      getShopSettings(),
      listAdminCategories(),
      listDocArticles(),
      getPartners(),
      // What the Zalo bot last said about itself: a QR to scan, or alive.
      db.setting.findUnique({ where: { key: ZALO_STATE_KEY } }),
    // What the bot did in the groups lately, for the block under its standing.
    db.zaloGroupEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        groupId: true,
        kind: true,
        name: true,
        note: true,
        createdAt: true,
      },
    }),
    ]);

  const zaloBotState = settleZaloBotState(readZaloBotState(zaloStateRow?.value));
  // An event names its group by id; the bot's own snapshot knows the name.
  const groupName = (id: string): string =>
    zaloBotState?.groups?.find((g) => g.id === id)?.name ?? id;

  return (
    <AdminChrome
      title="Cấu hình"
      subtitle="Mức nạp, trạng thái bán hàng, nhận diện shop và bố cục trang chủ"
      username={admin.username}
    >
      <AdminSettings
        settings={settings}
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        docs={docs.map((d) => ({ slug: d.slug, name: d.title }))}
        partners={partners}
        zaloBotState={zaloBotState}
        zaloGroupEvents={zaloGroupEvents.map((row) => ({
          id: row.id,
          group: groupName(row.groupId),
          kind: row.kind,
          name: row.name,
          note: row.note,
          at: row.createdAt.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          }),
        }))}
      />
    </AdminChrome>
  );
}
