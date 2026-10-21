import "server-only";

import { announceToUser } from "@/lib/announcementStore";
import { db } from "@/lib/db";
import { emailBrand } from "@/lib/emailBrand";
import { emailLayout, paragraphs } from "@/lib/emailTemplates";
import { sendMail } from "@/lib/mailer";
import { absoluteUrl } from "@/lib/seo";
import { mailEnabled } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

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

    // The same dressed layout as the receipt and the security mails, so a
    // warranty step does not arrive as four bare lines next to them (the
    // owner, 21/10/2026: "rà soát lại kỹ mấy cái nội dung gmail gửi cho
    // chuyên nghiệp").
    const link = absoluteUrl(href);
    const subject = `${settings.brandName} | ${notice.title}, đơn ${orderCode}`;
    const text =
      `Chào ${user.username},\n\n${notice.body}\n\n` +
      `Xem trạng thái đơn ${orderCode}: ${link}\n\n${settings.brandName}`;
    const html = emailLayout({
      brand: emailBrand(settings),
      preheader: notice.body,
      eyebrow: "Bảo hành",
      title: notice.title,
      introHtml: paragraphs([`Chào ${user.username},`, notice.body]),
      cta: { href: link, label: `Xem trạng thái đơn ${orderCode}` },
      footnote:
        "Shop trao đổi với bạn ngay trên trang trạng thái đơn, bạn không cần trả lời email này.",
    });
    await sendMail(settings, user.email, subject, text, html);
  } catch (error) {
    console.error("[warranty-mail]", error);
  }
}
