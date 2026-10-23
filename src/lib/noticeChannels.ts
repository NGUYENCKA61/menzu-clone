import "server-only";

import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/seo";
import { getShopSettings } from "@/lib/settingsStore";
import { escapeTelegramHtml, sendTelegramMessage } from "@/lib/telegramNotify";
import { zaloNoticeMessage } from "@/lib/zaloShared";

/**
 * A notice addressed to one customer, carried to wherever they have linked:
 * Telegram at once through the shop bot, Zalo through the outbox the bot on
 * the VPS drains (the owner, 12/10/2026: "tình trạng bảo hành hoặc thông báo
 * gửi về … cho từng khách hàng", then "làm cho tele với zalo thử").
 *
 * Called after the notice is written for the bell, and never allowed to fail
 * the action that earned the notice: a top-up that was credited must not
 * become an error page because Telegram was slow.
 */
export async function deliverNotice(
  userId: string,
  notice: {
    title: string;
    body: string;
    cta?: { label: string; href: string };
  },
): Promise<void> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { telegramId: true, zaloId: true },
    });
    if (!user || (!user.telegramId && !user.zaloId)) return;
    const url = notice.cta ? absoluteUrl(notice.cta.href) : null;

    if (user.telegramId) {
      const settings = await getShopSettings();
      const token = settings.telegramShopToken.trim();
      if (token) {
        const html =
          `<b>${escapeTelegramHtml(notice.title)}</b>\n${escapeTelegramHtml(notice.body)}` +
          (url ? `\n${url}` : "");
        // Not awaited past its own failure: a dead bot token is the shop's
        // problem to notice in Cấu hình, not the customer's request to fail.
        await sendTelegramMessage(token, user.telegramId, html).catch(
          () => false,
        );
      }
    }

    if (user.zaloId) {
      const message = zaloNoticeMessage(notice.title, notice.body, url);
      await db.zaloOutbox.create({
        data: { zaloId: user.zaloId, text: message.text, styles: message.styles },
      });
    }
  } catch {
    // Left undelivered rather than failing the action that earned it.
  }
}
