import "server-only";

import { sendMail } from "@/lib/mailer";
import { mailEnabled, warrantyAlertRecipients } from "@/lib/settings";
import { getShopSettings } from "@/lib/settingsStore";

/**
 * The shop's own mailbox hears about a warranty report (the owner,
 * 12/10/2026, VĐ 31: "gửi về gmail thông báo khi có khách hàng gửi bảo
 * hành"), beside the bell and Telegram that already ring.
 *
 * Plain text with a link; the desk opens the ticket, it does not read a
 * newsletter. Nothing here throws: a mailbox that bounces must never fail
 * the buyer's report, so every error is logged and swallowed, as the stock
 * alert does.
 */
export async function mailWarrantyAlert({
  subject,
  lines,
  href,
}: {
  subject: string;
  /** The body, one fact per line. */
  lines: string[];
  /** The admin page to open. */
  href: string;
}): Promise<void> {
  try {
    const settings = await getShopSettings();
    const recipients = warrantyAlertRecipients(settings);
    if (recipients.length === 0 || !mailEnabled(settings)) return;
    const text = [...lines, "", `Mở trong admin: ${href}`].join("\n");
    const html = `<p>${lines.map(escapeHtml).join("<br>")}</p><p><a href="${escapeHtml(href)}">Mở trong admin</a></p>`;
    await Promise.all(
      recipients.map((to) =>
        sendMail(settings, to, subject, text, html).catch((error: unknown) => {
          console.error("[warranty] alert mail to", to, "failed:", error);
        }),
      ),
    );
  } catch (error) {
    console.error("[warranty] alert mail failed:", error);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
