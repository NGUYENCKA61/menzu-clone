import { timingSafeEqual } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getShopSettings } from "@/lib/settingsStore";
import { parseStatusCommand } from "@/lib/statusCommand";

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
  chat?: { id?: number | string };
  photo?: TelegramPhoto[];
}

interface TelegramUpdate {
  message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_message?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

const ok = (body: Record<string, unknown>) => NextResponse.json({ ok: true, ...body });

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
  const message =
    update?.message ??
    update?.channel_post ??
    update?.edited_message ??
    update?.edited_channel_post;
  if (!message) return ok({ ignored: "không có nội dung" });

  if (String(message.chat?.id ?? "") !== chatId) {
    return ok({ ignored: "khác kênh" });
  }

  // A photo carries its words in the caption; a plain message in the text.
  const command = parseStatusCommand(message.text ?? message.caption);
  if (!command) return ok({ ignored: "không phải lệnh đổi trạng thái" });

  const product = await db.product.findFirst({
    where: {
      code: command.productCode,
      productType: "SOFTWARE_GAME",
      deletedAt: null,
    },
    select: { id: true, softwareStatus: true },
  });
  if (!product) return ok({ ignored: `không có tool ${command.productCode}` });

  if (product.softwareStatus === command.status) {
    // Saying the same thing twice is not a change, and a history full of
    // "still detected" would bury the moment it actually turned.
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

  return ok({
    code: command.productCode,
    status: command.status,
    photo: imageUrl !== null,
  });
}
