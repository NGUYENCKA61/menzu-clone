import { timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getShopSettings } from "@/lib/settingsStore";
import { SOFTWARE_STATUS } from "@/lib/softwareStatus";
import { parseStatusCommand } from "@/lib/statusCommand";
import {
  askNoteScreen,
  categoryScreen,
  clearPending,
  listScreenText,
  parseCallback,
  peekPending,
  searchScreen,
  setPending,
  setStatus,
  toolScreen,
  toolsScreen,
  type MenuScreen,
} from "@/lib/telegramMenu";
import {
  escapeTelegramHtml,
  postStatusToTelegram,
  sendTelegramMessage,
  telegramCall,
} from "@/lib/telegramNotify";

/**
 * Telegram's webhook: the shop's own channel drives the detection state.
 *
 * The shop already posts "VALTOOL01 die" in its channel the moment a tool goes
 * down. This is what makes that message the update, instead of something
 * somebody has to remember to copy into the admin desk afterwards — which is
 * exactly when it does not get copied, and the storefront goes on telling
 * customers a dead tool is safe.
 *
 * Three gates, all of which must pass:
 *   - a bot token and a chat id are configured (blank means the door is shut);
 *   - the secret header Telegram echoes back matches the configured one;
 *   - the message came from the configured chat.
 *
 * Telegram retries anything that is not a 2xx, so a message this endpoint
 * cannot use answers 200 with `{ ignored: … }` rather than an error status.
 * Only a genuine failure on our side is worth a retry.
 *
 * Setup, once a token is pasted into Cấu hình:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook
 *     ?url=https://<domain>/api/integrations/telegram
 *     &secret_token=<the same secret>
 */

/** Where a photo pulled off Telegram lands. Same folder family as uploads. */
const PHOTO_DIR = path.join(process.cwd(), "public", "uploads", "status");
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

interface TelegramPhoto {
  file_id?: string;
  file_size?: number;
}

interface TelegramMessage {
  text?: string;
  caption?: string;
  chat?: { id?: number | string; type?: string };
  from?: { id?: number | string };
  photo?: TelegramPhoto[];
}

interface TelegramCallback {
  id: string;
  from?: { id?: number | string };
  message?: { chat?: { id?: number | string; type?: string }; message_id?: number };
  data?: string;
}

interface TelegramUpdate {
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_message?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
  callback_query?: TelegramCallback;
}

const ok = (body: Record<string, unknown>) => NextResponse.json({ ok: true, ...body });

/**
 * Whether this Telegram user runs the channel. Asked of Telegram every time
 * rather than remembered: an admin taken off the channel must lose the bot
 * the same moment, and the desk is a handful of messages a day.
 */
async function isChannelAdmin(
  token: string,
  channelId: string,
  userId: number | string,
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent(
        channelId,
      )}&user_id=${encodeURIComponent(String(userId))}`,
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { result?: { status?: string } };
    return data.result?.status === "creator" || data.result?.status === "administrator";
  } catch {
    return false;
  }
}

/** What the bot says to /help — the syntax, in the words the desk types. */
function helpText(): string {
  return [
    "<b>Đổi trạng thái tool</b>",
    "Gõ mã tool, rồi trạng thái, rồi ghi chú nếu có. Gửi kèm ảnh thì ghi lệnh vào chú thích của ảnh.",
    "",
    "<code>HACK12 die</code> → 🔴 Đã phát hiện",
    "<code>HACK12 ok</code> → 🟢 Chưa phát hiện",
    "<code>HACK12 bảo trì đang fix</code> → 🟡 Đang cập nhật, ghi chú \"đang fix\"",
    "<code>HACK12 cập nhật mới thêm aimbot</code> → 🟣 Cập nhật mới, ghi chú \"thêm aimbot\"",
    "",
    "<b>Từ khóa trạng thái</b>",
    "🟢 ok, safe, live, ngon, an toàn, undetected",
    "🔵 stable, ổn định",
    "🟣 updated, new, xong, cập nhật mới, cập nhật xong, đã cập nhật",
    "🟠 risky, rủi ro, nguy hiểm, cảnh báo",
    "🟡 update, fix, bảo trì, cập nhật, đang cập nhật",
    "🔴 die, ban, dính, phát hiện, detected",
    "",
    "Nhắn ở đây hoặc đăng trong kênh đều được; đổi xong bot tự đăng lên kênh.",
    "",
    "<b>Không muốn gõ lệnh</b>",
    "/list mở menu: danh mục → tool → trạng thái. Chọn xong, gửi ghi chú kèm ảnh, hoặc bấm Đổi ngay.",
    "Gõ mã hoặc một từ trong tên tool để tìm nhanh, ví dụ <code>valorant</code>.",
  ].join("\n");
}

/** A screen as a fresh message, buttons under it. */
function showScreen(token: string, chatId: string, screen: MenuScreen): Promise<boolean> {
  return telegramCall(token, "sendMessage", {
    chat_id: chatId,
    text: screen.text,
    parse_mode: "HTML",
    reply_markup: { inline_keyboard: screen.keyboard },
  });
}

/**
 * A tap on one of the menu's buttons: redraw the message as the next screen,
 * and for a state button, make the change first — recorded and announced
 * exactly as a typed command would be.
 *
 * Every tap is answered, even a refused one: until answerCallbackQuery
 * arrives the tapped button shows a spinner, and a spinner that never stops
 * reads as a dead bot.
 */
async function handleCallback(token: string, channelId: string, query: TelegramCallback) {
  const answer = (text?: string) =>
    telegramCall(token, "answerCallbackQuery", {
      callback_query_id: query.id,
      ...(text ? { text } : {}),
    });

  const userId = query.from?.id;
  const chat = query.message?.chat;
  const messageId = query.message?.message_id;
  if (userId === undefined || chat?.id === undefined || messageId === undefined) {
    await answer();
    return ok({ ignored: "callback thiếu dữ liệu" });
  }
  // The menu is only ever sent to a private chat, but a forwarded copy of
  // it would carry the buttons along — so the tap is checked, not the chat.
  if (chat.type !== "private" || !(await isChannelAdmin(token, channelId, userId))) {
    await answer("Chỉ admin của kênh dùng được menu này.");
    return ok({ ignored: "không phải admin kênh" });
  }

  const action = parseCallback(query.data);
  if (!action) {
    await answer();
    return ok({ ignored: "callback lạ" });
  }

  let screen: MenuScreen | null = null;
  let toast: string | undefined;
  let redraw = true;
  switch (action.kind) {
    case "cats":
      screen = await categoryScreen();
      break;
    case "cat":
      screen = await toolsScreen(action.id);
      break;
    case "tool":
      screen = await toolScreen(action.id);
      break;
    case "set": {
      // Nothing changes yet: the next message from this admin is the note.
      screen = await askNoteScreen(action.id, action.status);
      if (screen) {
        setPending(String(userId), {
          productId: action.id,
          status: action.status,
          chatId: String(chat.id),
          messageId,
        });
      }
      break;
    }
    case "cancel":
      clearPending(String(userId));
      screen = await toolScreen(action.id);
      break;
    case "go": {
      clearPending(String(userId));
      const result = await setStatus(action.id, action.status);
      if (result === "changed") {
        await postStatusToTelegram(action.id, action.status, null, null);
        toast = `Đã đổi sang ${SOFTWARE_STATUS[action.status].label}, đã đăng lên kênh.`;
      } else if (result === "same") {
        toast = "Đang ở trạng thái đó rồi.";
        // Nothing changed, so the screen is already right; an edit to the
        // same text is one Telegram refuses, and refusals are logged.
        redraw = false;
      }
      screen = await toolScreen(action.id);
      break;
    }
  }

  if (!screen) {
    toast = "Mục này không còn nữa.";
    screen = await categoryScreen();
  }
  if (redraw) {
    await telegramCall(token, "editMessageText", {
      chat_id: chat.id,
      message_id: messageId,
      text: screen.text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: screen.keyboard },
    });
  }
  await answer(toast);
  return ok({ answered: action.kind });
}

/**
 * Downloads the largest photo on the message and returns its public path.
 *
 * Returns null on any trouble at all: a status change that arrives with an
 * unusable picture is still a status change, and refusing it over the picture
 * would leave the storefront lying about a dead tool.
 *
 * Note the same caveat every upload here carries — this writes to the server's
 * own disk, which does not survive a serverless deploy.
 */
async function savePhoto(
  photos: TelegramPhoto[] | undefined,
  token: string,
): Promise<string | null> {
  const largest = photos?.[photos.length - 1];
  if (!largest?.file_id) return null;
  if ((largest.file_size ?? 0) > MAX_PHOTO_BYTES) return null;

  try {
    const meta = (await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(largest.file_id)}`,
    ).then((r) => (r.ok ? r.json() : null))) as
      | { ok?: boolean; result?: { file_path?: string } }
      | null;
    const remote = meta?.result?.file_path;
    if (!remote) return null;

    const res = await fetch(`https://api.telegram.org/file/bot${token}/${remote}`);
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > MAX_PHOTO_BYTES) return null;

    // The extension comes from Telegram's own path, not from anything the
    // sender chose, and is narrowed to the handful an <img> can display.
    const ext = (remote.split(".").pop() ?? "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
    const name = `${Date.now().toString(36)}-${largest.file_id.slice(-8)}.${safeExt}`;

    await mkdir(PHOTO_DIR, { recursive: true });
    await writeFile(path.join(PHOTO_DIR, name), bytes);
    return `/uploads/status/${name}`;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const settings = await getShopSettings();
  const token = settings.telegramBotToken.trim();
  const secret = settings.telegramSecret.trim();
  const chatId = settings.telegramChatId.trim();

  // Not configured is not an error, but it must not look like a working
  // endpoint either: anyone can find this URL.
  if (!token || !secret || !chatId) {
    return NextResponse.json({ error: "Chưa bật đồng bộ Telegram" }, { status: 404 });
  }
  // Constant-time, like the wallet webhook/sync secrets: a plain !== leaks the
  // secret one byte at a time through response timing.
  const given = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const want = Buffer.from(secret);
  if (given.length !== want.length || !timingSafeEqual(given, want)) {
    return NextResponse.json({ error: "Sai secret" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (update?.callback_query) return handleCallback(token, chatId, update.callback_query);

  const message =
    update?.message ??
    update?.channel_post ??
    update?.edited_message ??
    update?.edited_channel_post;
  if (!message) return ok({ ignored: "không có nội dung" });

  // Two places the bot listens: the channel itself, and a private chat with
  // one of the channel's own admins — so the desk can ask for the list and
  // check the syntax without every customer reading the keystrokes. Anyone
  // else who finds the bot gets silence.
  const fromChannel = String(message.chat?.id ?? "") === chatId;
  if (!fromChannel) {
    const userId = message.from?.id;
    if (message.chat?.type !== "private" || userId === undefined) {
      return ok({ ignored: "khác kênh" });
    }
    if (!(await isChannelAdmin(token, chatId, userId))) {
      return ok({ ignored: "không phải admin kênh" });
    }
  }
  // An answer goes back where the words came from: the channel, or the
  // admin's own chat.
  const replyTo = fromChannel ? chatId : String(message.chat?.id);
  const reply = (text: string) => sendTelegramMessage(token, replyTo, text);

  // A photo carries its words in the caption; a plain message in the text.
  const text = (message.text ?? message.caption ?? "").trim();
  const slash = /^\/([a-z_]+)(?:@\w+)?(?:\s|$)/i.exec(text)?.[1]?.toLowerCase();
  if (slash === "start" || slash === "help") {
    await reply(helpText());
    return ok({ answered: "help" });
  }
  if (slash === "list") {
    if (fromChannel) {
      for (const chunk of await listScreenText()) await reply(chunk);
    } else {
      await showScreen(token, replyTo, await categoryScreen());
    }
    return ok({ answered: "list" });
  }

  const command = parseStatusCommand(text);
  const userKey = message.from?.id !== undefined ? String(message.from.id) : null;
  if (!command) {
    // The channel carries the shop's other posts too, so a post that is not
    // a command is simply not for the bot.
    if (fromChannel) return ok({ ignored: "không phải lệnh đổi trạng thái" });

    // In a private chat every message is for the bot: the note a tapped state
    // is waiting for, or else a search.
    const waiting = userKey ? peekPending(userKey) : null;
    if (waiting && userKey) {
      clearPending(userKey);
      const imageUrl = await savePhoto(message.photo, token);
      const note = text || null;
      const result = await setStatus(waiting.productId, waiting.status, note, imageUrl);
      if (result === "changed") {
        await postStatusToTelegram(waiting.productId, waiting.status, note, imageUrl);
        await reply(
          `✅ Đã đổi sang <b>${SOFTWARE_STATUS[waiting.status].label}</b>${note ? " kèm ghi chú" : ""}${
            imageUrl ? " và ảnh" : ""
          }. Đã đăng lên kênh.`,
        );
      } else if (result === "same") {
        await reply("Tool đang ở trạng thái đó rồi, không có gì đổi.");
      } else {
        await reply("Tool này không còn nữa.");
      }
      const after = await toolScreen(waiting.productId);
      if (after) {
        await telegramCall(token, "editMessageText", {
          chat_id: waiting.chatId,
          message_id: waiting.messageId,
          text: after.text,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: after.keyboard },
        });
      }
      return ok({ answered: "note" });
    }

    if (text) {
      await showScreen(token, replyTo, await searchScreen(text));
      return ok({ answered: "search" });
    }
    await reply("Gõ mã hoặc tên tool để tìm, /list để mở menu, /help để xem cú pháp.");
    return ok({ ignored: "không phải lệnh đổi trạng thái" });
  }
  // A typed command outranks a tap left half-done.
  if (userKey) clearPending(userKey);

  const product = await db.product.findFirst({
    where: {
      code: command.productCode,
      productType: "SOFTWARE_GAME",
      deletedAt: null,
    },
    select: { id: true, softwareStatus: true },
  });
  if (!product) {
    if (!fromChannel) {
      await reply(
        `Không có tool mã <b>${escapeTelegramHtml(command.productCode)}</b>. Gõ /list để xem mã.`,
      );
    }
    return ok({ ignored: `không có tool ${command.productCode}` });
  }

  if (product.softwareStatus === command.status) {
    // Saying the same thing twice is not a change, and a history full of
    // "still detected" would bury the moment it actually turned.
    if (!fromChannel) {
      await reply(
        `${command.productCode} đang ở trạng thái <b>${SOFTWARE_STATUS[command.status].label}</b> rồi, không có gì đổi.`,
      );
    }
    return ok({ ignored: "trạng thái không đổi", code: command.productCode });
  }

  const imageUrl = await savePhoto(message.photo, token);

  await db.$transaction([
    db.product.update({
      where: { id: product.id },
      data: { softwareStatus: command.status },
    }),
    db.softwareStatusEvent.create({
      data: {
        productId: product.id,
        status: command.status,
        note: command.note || null,
        imageUrl,
        source: "telegram",
      },
    }),
  ]);

  // Announce it back out to the channel the customers watch — after the change
  // is saved, and never blocking the webhook's reply to Telegram.
  await postStatusToTelegram(product.id, command.status, command.note || null, imageUrl);
  if (!fromChannel) {
    await reply(
      `✅ ${command.productCode} → <b>${SOFTWARE_STATUS[command.status].label}</b>. Đã đăng lên kênh.`,
    );
  }

  return ok({
    code: command.productCode,
    status: command.status,
    photo: imageUrl !== null,
  });
}
