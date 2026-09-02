import "server-only";

import { db } from "@/lib/db";
import { productHref } from "@/lib/routes";
import { absoluteUrl } from "@/lib/seo";
import { getShopSettings } from "@/lib/settingsStore";
import {
  SOFTWARE_STATUS,
  STATUS_EVENT_COPY,
  type SoftwareStatusValue,
} from "@/lib/softwareStatus";

/**
 * Posting a hack's status change out to the shop's Telegram channel.
 *
 * The webhook the other direction — an admin messaging the bot to *set* a
 * status — has been here a while; this is the reply the customers see. Fired
 * after the status has already been written and its event recorded, and it
 * never throws: a post that fails (bad token, Telegram down, a localhost image
 * URL its servers cannot reach) must not roll back the status change that
 * earned it.
 *
 * Silent when no bot token or chat id is configured, which is the honest
 * outcome — the shop simply has not turned this on.
 */

/** A coloured dot per state, so the channel reads at a glance. */
const STATUS_EMOJI: Record<SoftwareStatusValue, string> = {
  UNDETECTED: "🟢",
  DETECTED: "🔴",
  UPDATING: "🟡",
};

/** Telegram's HTML parse mode needs only these three escaped in text. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function postStatusToTelegram(
  productId: string,
  status: SoftwareStatusValue,
  note: string | null,
  imageUrl: string | null,
): Promise<void> {
  try {
    const settings = await getShopSettings();
    const token = settings.telegramBotToken.trim();
    const chatId = settings.telegramChatId.trim();
    if (!token || !chatId) return;

    const product = await db.product.findUnique({
      where: { id: productId },
      select: { name: true, code: true, slug: true, category: { select: { slug: true } } },
    });
    if (!product) return;

    const name = product.name ?? product.code;
    const link = absoluteUrl(productHref(product.category.slug, product.slug));
    const text = [
      `${STATUS_EMOJI[status]} <b>${escapeHtml(name)}</b>`,
      `Trạng thái: <b>${SOFTWARE_STATUS[status].label}</b>`,
      escapeHtml(`${name} ${STATUS_EVENT_COPY[status]}`),
      note ? `📝 ${escapeHtml(note)}` : "",
      `🔗 ${link}`,
    ]
      .filter(Boolean)
      .join("\n");

    // A picture reads better in a channel, but Telegram fetches it from a
    // public URL — on a dev box that URL is localhost and the fetch fails, so
    // fall back to the text-only message rather than posting nothing.
    if (imageUrl) {
      const photo = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: absoluteUrl(imageUrl),
          caption: text,
          parse_mode: "HTML",
        }),
      });
      if (photo.ok) return;
    }

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // Left unsent rather than failing the status change that earned it.
  }
}
