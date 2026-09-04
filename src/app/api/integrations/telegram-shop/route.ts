import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getShopSettings } from "@/lib/settingsStore";
import type { MenuScreen } from "@/lib/telegramMenu";
import { sendTelegramMessage, telegramCall } from "@/lib/telegramNotify";
import {
  buy,
  categoriesScreen,
  categoryScreen,
  confirmAccountScreen,
  confirmKeysScreen,
  confirmPoolScreen,
  createTopUp,
  displayName,
  helpText,
  homeScreen,
  linkTelegram,
  ordersScreen,
  parseShopCallback,
  productScreen,
  readLinkToken,
  shopUserForTelegram,
  statusScreen,
  topupScreen,
  walletScreen,
  type ShopUser,
  type TelegramFrom,
} from "@/lib/telegramShop";

/**
 * Telegram's webhook for the shop bot — the one customers talk to.
 *
 * Every update names a Telegram user; that user is a shop user (made on the
 * spot if new), and everything after is a screen from lib/telegramShop. A
 * button tap redraws the message it sits on; a purchase and a top-up are sent
 * as fresh messages so the goods and the bank details stay in the chat.
 *
 * Telegram retries anything that is not a 2xx, so anything this endpoint
 * cannot use answers 200 with `{ ignored: … }`.
 *
 * Set up automatically when the token is saved in Cấu hình (setUpShopBot).
 */

interface TelegramMessage {
  text?: string;
  chat?: { id?: number | string; type?: string };
  from?: TelegramFrom;
}
interface TelegramCallback {
  id: string;
  from?: TelegramFrom;
  message?: { chat?: { id?: number | string }; message_id?: number };
  data?: string;
}
interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: TelegramCallback;
}

const ok = (body: Record<string, unknown>) => NextResponse.json({ ok: true, ...body });

/**
 * Who typed a bare number last asked to type one: the top-up screen says
 * "or type the amount", and this remembers who it said that to. In memory,
 * ten minutes; a lost entry just means the number is ignored.
 */
const awaitingAmount = new Map<string, number>();
const AWAIT_MS = 10 * 60 * 1000;

function show(token: string, chatId: string, screen: MenuScreen): Promise<boolean> {
  return telegramCall(token, "sendMessage", {
    chat_id: chatId,
    text: screen.text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: screen.keyboard },
    disable_web_page_preview: true,
  });
}

async function redraw(
  token: string,
  chatId: string,
  messageId: number | undefined,
  screen: MenuScreen,
): Promise<boolean> {
  if (messageId === undefined) return show(token, chatId, screen);
  const edited = await telegramCall(token, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text: screen.text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: screen.keyboard },
    disable_web_page_preview: true,
  });
  // "message is not modified" and a message too old to edit both land here;
  // a fresh message is the right answer to either.
  return edited || show(token, chatId, screen);
}

async function sendTopUp(
  token: string,
  chatId: string,
  user: ShopUser,
  amount: number,
): Promise<void> {
  const settings = await getShopSettings();
  const made = await createTopUp(user, amount, settings);
  if ("error" in made) {
    await show(token, chatId, {
      text: `❌ ${made.error}`,
      keyboard: [[{ text: "💳 Chọn số khác", callback_data: "n" }, { text: "🏠 Menu", callback_data: "h" }]],
    });
    return;
  }
  const keyboard = { inline_keyboard: [[{ text: "🏠 Menu", callback_data: "h" }]] };
  const sent = made.qrUrl
    ? await telegramCall(token, "sendPhoto", {
        chat_id: chatId,
        photo: made.qrUrl,
        caption: made.text,
        parse_mode: "HTML",
        reply_markup: keyboard,
      })
    : false;
  if (!sent) {
    await telegramCall(token, "sendMessage", {
      chat_id: chatId,
      text: made.text,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }
}

async function handleCallback(token: string, query: TelegramCallback) {
  const answer = (text?: string) =>
    telegramCall(token, "answerCallbackQuery", {
      callback_query_id: query.id,
      ...(text ? { text, show_alert: false } : {}),
    });
  const chatId = query.message?.chat?.id;
  if (!query.from || chatId === undefined) {
    await answer();
    return ok({ ignored: "không rõ người bấm" });
  }
  const chat = String(chatId);
  const messageId = query.message?.message_id;
  const action = parseShopCallback(query.data);
  if (!action) {
    await answer("Nút này đã cũ, gõ /menu để mở lại.");
    return ok({ ignored: "callback lạ" });
  }
  const user = await shopUserForTelegram(query.from);
  const settings = await getShopSettings();
  const gone = { text: "Sản phẩm này không còn, chọn lại nhé.", keyboard: [[{ text: "🛒 Mua hack", callback_data: "c" }]] };

  switch (action.kind) {
    case "home":
      await redraw(token, chat, messageId, homeScreen(displayName(query.from, user), user, settings));
      break;
    case "cats":
      await redraw(token, chat, messageId, await categoriesScreen());
      break;
    case "cat":
      await redraw(token, chat, messageId, (await categoryScreen(action.id)) ?? gone);
      break;
    case "product":
      await redraw(token, chat, messageId, (await productScreen(action.id)) ?? gone);
      break;
    case "confirmKeys":
      await redraw(
        token,
        chat,
        messageId,
        (await confirmKeysScreen(user, action.packageId, action.quantity)) ?? gone,
      );
      break;
    case "confirmPool":
      await redraw(
        token,
        chat,
        messageId,
        (await confirmPoolScreen(user, action.productId, action.quantity)) ?? gone,
      );
      break;
    case "confirmAccount":
      await redraw(token, chat, messageId, (await confirmAccountScreen(user, action.productId)) ?? gone);
      break;
    case "buyKeys": {
      const pkg = await db.productPackage.findUnique({
        where: { id: action.packageId },
        select: { product: { select: { code: true } } },
      });
      if (!pkg) {
        await redraw(token, chat, messageId, gone);
        break;
      }
      // The buttons come off the confirm message so a second tap cannot buy
      // twice; the goods arrive as their own message.
      await telegramCall(token, "editMessageReplyMarkup", {
        chat_id: chat,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      });
      await show(
        token,
        chat,
        await buy(user, { code: pkg.product.code, packageId: action.packageId, quantity: action.quantity }),
      );
      break;
    }
    case "buyPool":
    case "buyAccount": {
      const product = await db.product.findUnique({
        where: { id: action.productId },
        select: { code: true },
      });
      if (!product) {
        await redraw(token, chat, messageId, gone);
        break;
      }
      await telegramCall(token, "editMessageReplyMarkup", {
        chat_id: chat,
        message_id: messageId,
        reply_markup: { inline_keyboard: [] },
      });
      await show(
        token,
        chat,
        await buy(user, {
          code: product.code,
          quantity: action.kind === "buyPool" ? action.quantity : 1,
        }),
      );
      break;
    }
    case "wallet":
      await redraw(token, chat, messageId, await walletScreen(user));
      break;
    case "topup":
      awaitingAmount.set(String(query.from.id), Date.now() + AWAIT_MS);
      await redraw(token, chat, messageId, topupScreen(settings, action.shortfall));
      break;
    case "topupAmount":
      awaitingAmount.delete(String(query.from.id));
      await sendTopUp(token, chat, user, action.amount);
      break;
    case "orders":
      await redraw(token, chat, messageId, await ordersScreen(user));
      break;
    case "status":
      await redraw(token, chat, messageId, await statusScreen());
      break;
  }
  await answer();
  return ok({ answered: action.kind });
}

export async function POST(request: Request) {
  const settings = await getShopSettings();
  const token = settings.telegramShopToken.trim();
  const secret = settings.telegramShopSecret.trim();
  if (!token || !secret) {
    return NextResponse.json({ error: "Chưa bật bot bán hàng" }, { status: 404 });
  }
  const given = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(secret);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return NextResponse.json({ error: "Sai secret" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (update?.callback_query) return handleCallback(token, update.callback_query);

  const message = update?.message;
  if (!message?.from || message.chat?.type !== "private" || message.chat.id === undefined) {
    return ok({ ignored: "không phải chat riêng" });
  }
  const chat = String(message.chat.id);
  const from = message.from;
  const key = String(from.id);
  const text = (message.text ?? "").trim();
  const slash = /^\/([a-z_]+)(?:@\w+)?(?:\s|$)/i.exec(text)?.[1]?.toLowerCase();
  const arg = text.replace(/^\/[a-z_]+(?:@\w+)?\s*/i, "").trim();

  // The profile page's link: /start link_<token>. Verified before the shop
  // account is looked up, since the whole point is to pick a different one.
  if (slash === "start" && arg.startsWith("link_")) {
    const webUserId = readLinkToken(arg, secret);
    if (!webUserId) {
      await sendTelegramMessage(token, chat, "Link liên kết đã hết hạn. Mở lại trang Hồ sơ trên web và bấm Liên kết Telegram lần nữa.");
      return ok({ answered: "link-expired" });
    }
    const outcome = await linkTelegram(webUserId, from);
    const user = await shopUserForTelegram(from);
    const said =
      outcome === "linked"
        ? "✅ Đã liên kết. Từ giờ ví và đơn hàng trên web và trên Telegram là một."
        : outcome === "busy"
          ? "Tài khoản Telegram này đã có ví riêng với tiền hoặc đơn hàng, nên không tự gộp được. Liên hệ hỗ trợ để gộp tay."
          : "Tài khoản web này đã liên kết với một Telegram khác.";
    await sendTelegramMessage(token, chat, said);
    await show(token, chat, homeScreen(displayName(from, user), user, settings));
    return ok({ answered: `link-${outcome}` });
  }

  const user = await shopUserForTelegram(from);

  if (slash === "start" || slash === "menu") {
    awaitingAmount.delete(key);
    await show(token, chat, homeScreen(displayName(from, user), user, settings));
    return ok({ answered: "home" });
  }
  if (slash === "help") {
    await sendTelegramMessage(token, chat, helpText(settings));
    return ok({ answered: "help" });
  }
  if (slash === "vi" || slash === "wallet") {
    await show(token, chat, await walletScreen(user));
    return ok({ answered: "wallet" });
  }
  if (slash === "donhang" || slash === "orders") {
    await show(token, chat, await ordersScreen(user));
    return ok({ answered: "orders" });
  }
  if (slash === "trangthai" || slash === "status") {
    await show(token, chat, await statusScreen());
    return ok({ answered: "status" });
  }
  if (slash === "nap" || slash === "topup") {
    const amount = Number(arg.replace(/\D/g, ""));
    if (amount > 0) {
      awaitingAmount.delete(key);
      await sendTopUp(token, chat, user, amount);
      return ok({ answered: "topup-made" });
    }
    awaitingAmount.set(key, Date.now() + AWAIT_MS);
    await show(token, chat, topupScreen(settings));
    return ok({ answered: "topup" });
  }

  // A bare number right after the top-up screen asked for one.
  const digits = text.replace(/[.,\s]/g, "");
  const waiting = awaitingAmount.get(key);
  if (waiting && waiting > Date.now() && /^\d{4,10}$/.test(digits)) {
    awaitingAmount.delete(key);
    await sendTopUp(token, chat, user, Number(digits));
    return ok({ answered: "topup-typed" });
  }

  await show(token, chat, homeScreen(displayName(from, user), user, settings));
  return ok({ answered: "home-fallback" });
}
