import "server-only";

import { announceToUser } from "@/lib/announcementStore";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mailer";
import { absoluteUrl } from "@/lib/seo";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Tell the buyer where their warranty report stands, at every step: the bell
 * on the site, and an email when the account has an address and the shop has
 * set up mail (the owner, 01/10/2026: "gửi thông báo tình hình tình trạng cho
 * khách hàng thông qua gmail nữa").
 *
 * Both lead to the order's warranty page, which is the status page. The email
 * never holds the step up: a desk action that already moved money must not
 * fail because an SMTP server did not answer, so a failure is logged and
 * swallowed — the bell already carries the news.
 *
 * `chat` — a message from the shop in the ticket's conversation. Every one
 * rings the bell, but it emails only when the ticket's last email is
 * MAIL_GAP_MS old (agreed 01/10/2026), so a run of quick replies is one
 * email. A status change always emails, and restarts that clock.
 */
export const MAIL_GAP_MS = 10 * 60 * 1000;

export async function notifyWarranty(
  userId: string,
  orderCode: string,
  notice: { title: string; body: string },
  options: { ticketId: string; chat?: boolean },
): Promise<void> {
  const href = `/orders/${orderCode}/bao-hanh`;
  await announceToUser(userId, {
    title: notice.title,
    body: notice.body,
    type: "INFO",
    cta: { label: "Xem trạng thái", href },
  });

  try {
    const [user, settings] = await Promise.all([
      db.user.findUnique({ where: { id: userId }, select: { email: true, username: true } }),
      getShopSettings(),
    ]);
    if (!user?.email || !mailEnabled(settings)) return;

    // Claimed in one statement, so two replies a second apart cannot both
    // find the clock run out.
    const now = new Date();
    const claimed = await db.warrantyRequest.updateMany({
      where: options.chat
        ? {
            id: options.ticketId,
            OR: [{ mailedAt: null }, { mailedAt: { lt: new Date(now.getTime() - MAIL_GAP_MS) } }],
          }
        : { id: options.ticketId },
      data: { mailedAt: now },
    });
    if (options.chat && claimed.count === 0) return;

    const link = absoluteUrl(href);
    const subject = `${notice.title}, đơn ${orderCode}`;
    const text =
      `Chào ${user.username},\n\n${notice.body}\n\n` +
      `Xem trạng thái đơn ${orderCode}: ${link}\n\n${settings.brandName}`;
    const html =
      `<p>Chào ${escapeHtml(user.username)},</p>` +
      `<p>${escapeHtml(notice.body)}</p>` +
      `<p><a href="${escapeHtml(link)}">Xem trạng thái đơn ${escapeHtml(orderCode)}</a></p>` +
      `<p>${escapeHtml(settings.brandName)}</p>`;
    await sendMail(settings, user.email, subject, text, html);
  } catch (error) {
    console.error("[warranty-mail]", error);
  }
}
