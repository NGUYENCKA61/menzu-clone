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
 * The shop's Telegram bot, talking outward.
 *
 * The webhook the other direction — an admin messaging the bot to *set* a
 * status — lives in the integrations route; this is everything the bot says:
 * a status change posted to the channel, a notice the desk published, and
 * the small helpers the webhook uses to answer an admin. Nothing here throws
 * to a caller: a post that fails (bad token, Telegram down, a localhost image
 * URL its servers cannot reach) must not roll back the change that earned it.
 * It is written to the log instead, so a bot that goes quiet leaves a reason
 * behind — until it did, a wrong chat id looked exactly like a working one.
 *
 * Silent when no bot token or chat id is configured, which is the honest
 * outcome — the shop simply has not turned this on.
 */

/** A coloured dot per state, so the channel reads at a glance. */
export const STATUS_EMOJI: Record<SoftwareStatusValue, string> = {
  UNDETECTED: "🟢",
  DETECTED: "🔴",
  UPDATING: "🟡",
  STABLE: "🔵",
  UPDATED: "🟣",
  RISKY: "🟠",
};

/** Telegram's HTML parse mode needs only these three escaped in text. */
export function escapeTelegramHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * One Bot API call; true when Telegram accepted it. A refusal is logged with
 * Telegram's own reason, which names the wrong chat id or the character its
 * HTML parser rejected — the two ways a bot goes quiet.
 */
export async function telegramCall(
  token: string,
  method: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return true;
    const body = await res.text().catch(() => "");
    console.error(`[telegram] ${method} refused: ${res.status} ${body.slice(0, 300)}`);
    return false;
  } catch (error) {
    console.error(`[telegram] ${method} failed:`, error);
    return false;
  }
}

/** A text message, HTML parse mode, to one chat. */
export function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string,
): Promise<boolean> {
  return telegramCall(token, "sendMessage", { chat_id: chatId, text, parse_mode: "HTML" });
}

/**
 * The "/" menu Telegram shows in a chat with the bot. Registered again on
 * every settings save rather than once: a new token is a new bot with an
 * empty menu, and nobody would think to redo it by hand.
 */
export async function registerTelegramCommands(token: string): Promise<void> {
  await telegramCall(token, "setMyCommands", {
    commands: [
      { command: "list", description: "Mã tool và trạng thái hiện tại" },
      { command: "notice", description: "Đăng thông báo hệ thống lên web và kênh" },
      { command: "help", description: "Cú pháp đổi trạng thái" },
      { command: "cancel", description: "Hủy thao tác đang dở" },
    ],
  });
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
      `${STATUS_EMOJI[status]} <b>${escapeTelegramHtml(name)}</b>`,
      `Trạng thái: <b>${SOFTWARE_STATUS[status].label}</b>`,
      escapeTelegramHtml(`${name} ${STATUS_EVENT_COPY[status]}`),
      note ? `📝 ${escapeTelegramHtml(note)}` : "",
      `🔗 ${link}`,
    ]
      .filter(Boolean)
      .join("\n");

    // A picture reads better in a channel, but Telegram fetches it from a
    // public URL — on a dev box that URL is localhost and the fetch fails, so
    // fall back to the text-only message rather than posting nothing.
    if (imageUrl) {
      const sent = await telegramCall(token, "sendPhoto", {
        chat_id: chatId,
        photo: absoluteUrl(imageUrl),
        caption: text,
        parse_mode: "HTML",
      });
      if (sent) return;
    }

    await sendTelegramMessage(token, chatId, text);
  } catch (error) {
    // Left unsent rather than failing the status change that earned it.
    console.error("[telegram] status post failed:", error);
  }
}

/** One glyph per kind of notice, so the channel can tell a sale from an outage. */
export const NOTICE_EMOJI: Record<string, string> = {
  UPDATE: "🆕",
  MAINTENANCE: "🛠️",
  PROMO: "🎉",
  INFO: "📢",
  GIFT: "🎁",
};

/**
 * A notice from the admin desk, posted to the channel.
 *
 * Only what the whole shop is meant to read goes out: a notice addressed to
 * named customers (a refund answered, a spin win) is theirs, and a draft or
 * one scheduled for later is not yet anyone's. Called from the desk's create
 * and publish handlers only, so the notices the code writes on its own never
 * reach the channel.
 */
export async function postAnnouncementToTelegram(announcementId: string): Promise<void> {
  try {
    const settings = await getShopSettings();
    const token = settings.telegramBotToken.trim();
    const chatId = settings.telegramChatId.trim();
    if (!token || !chatId) return;

    const notice = await db.announcement.findUnique({
      where: { id: announcementId },
      select: {
        title: true,
        body: true,
        type: true,
        status: true,
        audience: true,
        bullets: true,
        noticeTitle: true,
        noticeBody: true,
        imageUrl: true,
        ctaHref: true,
        startAt: true,
      },
    });
    if (!notice || notice.status !== "PUBLISHED" || notice.audience !== "ALL") return;
    if (notice.startAt.getTime() > Date.now()) return;

    // Telegram caps a message at 4096 characters. Cut the prose, never the
    // markup: a tag sliced in half is a message Telegram refuses whole.
    const body = notice.body.length > 1500 ? `${notice.body.slice(0, 1500)}…` : notice.body;
    const lines = [
      `${NOTICE_EMOJI[notice.type] ?? "📢"} <b>${escapeTelegramHtml(notice.title)}</b>`,
      "",
      escapeTelegramHtml(body),
      ...notice.bullets.slice(0, 10).map((line) => `• ${escapeTelegramHtml(line)}`),
    ];
    if (notice.noticeTitle && notice.noticeBody) {
      lines.push(
        "",
        `<b>${escapeTelegramHtml(notice.noticeTitle)}</b>`,
        escapeTelegramHtml(notice.noticeBody),
      );
    }
    const link = `🔗 ${absoluteUrl(notice.ctaHref ?? "/thong-bao")}`;
    lines.push("", link);
    const text = lines.join("\n");

    // A picture goes out as a photo with the words in its caption. Telegram
    // caps a caption at 1024 characters, so a long notice sends the picture
    // under its title and the full text right behind it.
    if (notice.imageUrl) {
      const fits = text.length <= 1000;
      const sent = await telegramCall(token, "sendPhoto", {
        chat_id: chatId,
        photo: absoluteUrl(notice.imageUrl),
        caption: fits ? text : `${lines[0] ?? ""}\n\n${link}`,
        parse_mode: "HTML",
      });
      if (sent && fits) return;
    }

    await sendTelegramMessage(token, chatId, text);
  } catch (error) {
    console.error("[telegram] notice post failed:", error);
  }
}
