import { currentAnnouncements } from "@/lib/announcementStore";
import { getCurrentUser } from "@/lib/session";
import { getShopSettings } from "@/lib/settingsStore";

import { SiteHeaderClient } from "./SiteHeaderClient";

/**
 * Server wrapper so the header renders the signed-in state on the first paint.
 * Fetching the session client-side would flash the "Đăng nhập" button on every
 * page load for users who are already signed in.
 *
 * Pages import this; the interactive parts live in SiteHeaderClient.
 */
export async function SiteHeader() {
  // The reader has to be known before the notices can be: a targeted notice is
  // fetched by matching their account, so this cannot be one Promise.all.
  const [user, settings] = await Promise.all([getCurrentUser(), getShopSettings()]);
  const announcements = await currentAnnouncements(user?.id ?? null);

  return (
    <SiteHeaderClient
      brand={{ name: settings.brandName, logo: settings.brandLogo }}
      // "5 phút trước" goes over as ISO, because it has to be measured against
      // the reader's clock; the update date is formatted here, where the
      // timezone is fixed and the two renders cannot disagree.
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        bullets: a.bullets,
        noticeTitle: a.noticeTitle,
        noticeBody: a.noticeBody,
        type: a.type,
        priority: a.priority,
        revision: a.revision,
        startAt: a.startAt.toISOString(),
        updatedLabel: a.updatedAt.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      }))}
      user={
        user
          ? {
              username: user.username,
              balance: user.balance,
              avatarUrl: user.avatarUrl,
              uid: user.uid,
              role: user.role,
            }
          : null
      }
    />
  );
}
