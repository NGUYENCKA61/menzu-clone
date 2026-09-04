import { NextResponse } from "next/server";

import { FORBIDDEN, getAdmin } from "@/lib/admin";
import { normalizeSettings, validateSettings, type ShopSettings } from "@/lib/settings";
import { getShopSettings, saveShopSettings } from "@/lib/settingsStore";
import { registerTelegramCommands } from "@/lib/telegramNotify";
import { setUpShopBot } from "@/lib/telegramShop";

/** The current settings, for anything that wants them without a page load. */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  return NextResponse.json(await getShopSettings());
}

/**
 * Replace the settings.
 *
 * The body is laid over what is stored before it is normalized, so a caller
 * may send only the fields it edits — the Cấu hình form still sends the whole
 * object, but the HOT PICK control on the Kho ảnh screen sends one field and
 * must not blank the rest on its way through.
 */
export async function PUT(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json(FORBIDDEN, { status: 403 });

  const body = (await request.json().catch(() => null)) as Partial<ShopSettings> | null;
  if (!body) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });

  const settings = normalizeSettings({ ...(await getShopSettings()), ...body });

  const invalid = validateSettings(settings);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  await saveShopSettings(settings);
  // The bot's "/" menu follows the token: a new token is a new bot with an
  // empty menu. Cheap, idempotent, and logged rather than thrown on failure.
  if (settings.telegramBotToken.trim()) {
    await registerTelegramCommands(settings.telegramBotToken.trim());
  }
  // The shop bot needs more than a menu: its webhook is pointed at this site
  // and its @handle is read back, since the profile page links to it by name.
  if (settings.telegramShopToken.trim() && settings.telegramShopSecret.trim()) {
    const username = await setUpShopBot(
      settings.telegramShopToken.trim(),
      settings.telegramShopSecret.trim(),
    );
    if (username && username !== settings.telegramShopUsername) {
      settings.telegramShopUsername = username;
      await saveShopSettings(settings);
    }
  }
  return NextResponse.json(settings);
}
