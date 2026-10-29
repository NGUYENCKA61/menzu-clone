import type { Metadata } from "next";

import { CrmPost } from "@/components/sites/menzu-lol-f7ae197a/crm/CrmPost";
import { db } from "@/lib/db";
import { readFacebookPage } from "@/lib/facebookPage";
import { getShopSettings } from "@/lib/settingsStore";

export const metadata: Metadata = { title: "Đăng bài" };
export const dynamic = "force-dynamic";

export default async function CrmPostPage() {
  const [settings, facebook, products, recent] = await Promise.all([
    getShopSettings(),
    readFacebookPage(),
    db.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        code: true,
        productType: true,
        category: { select: { name: true } },
      },
      orderBy: [{ productType: "asc" }, { name: "asc" }],
      take: 150,
    }),
    db.announcement.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, createdAt: true },
    }),
  ]);

  return (
    <CrmPost
      products={products.map((product) => ({
        id: product.id,
        label: `${product.name ?? product.code} (${product.category.name})`,
        type: product.productType,
      }))}
      ready={{
        telegram: Boolean(settings.telegramBotToken.trim() && settings.telegramChatId.trim()),
        zaloGroups: settings.zaloGroupIds.length,
        facebook: Boolean(facebook),
      }}
      recent={recent.map((notice) => ({
        id: notice.id,
        title: notice.title,
        createdAt: notice.createdAt.toISOString(),
      }))}
    />
  );
}
