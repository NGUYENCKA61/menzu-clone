import "server-only";

import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { getShopSettings } from "@/lib/settingsStore";
import { noticeText } from "@/lib/zaloShared";

/**
 * A shop notice into the Zalo groups (the owner, 12/10/2026: "thông báo đăng
 * vào nhóm"): queued as one outbox row per chosen group, which the bot sends
 * when it next drains. Only while Cấu hình names at least one group and has
 * the posting switched on; never allowed to fail the thing that was announced.
 */
export async function postAnnouncementToZaloGroup(
  announcementId: string,
): Promise<void> {
  try {
    const settings = await getShopSettings();
    const groupIds = settings.zaloGroupIds;
    if (groupIds.length === 0 || !settings.zaloGroupPost) return;
    const row = await db.announcement.findUnique({
      where: { id: announcementId },
      select: {
        title: true,
        body: true,
        status: true,
        audience: true,
        ctaHref: true,
      },
    });
    // A draft, or a notice addressed to a few accounts, is not the group's.
    if (!row || row.status !== "PUBLISHED" || row.audience === "USERS") return;
    const url = row.ctaHref ? absoluteUrl(row.ctaHref) : absoluteUrl("/thong-bao");
    const text = noticeText(row.title, row.body, url);
    await db.zaloOutbox.createMany({
      data: groupIds.map((groupId) => ({
        zaloId: groupId,
        kind: "GROUP_POST" as const,
        text,
      })),
    });
  } catch {
    // Left unposted rather than failing the announcement.
  }
}
