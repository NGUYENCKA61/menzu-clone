import { db } from "@/lib/db";
import { parseSettings, serializeSettings, type ShopSettings } from "@/lib/settings";

/** Reads every setting in one query, filling unwritten keys from the defaults. */
export async function getShopSettings(): Promise<ShopSettings> {
  return parseSettings(await db.setting.findMany());
}

/** Writes every setting. Keys are upserted, so the first save creates them. */
export async function saveShopSettings(settings: ShopSettings): Promise<void> {
  await db.$transaction(
    serializeSettings(settings).map(({ key, value }) =>
      db.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
    ),
  );
}
