import { cache } from "react";

import { db } from "@/lib/db";
import { parseSettings, serializeSettings, type ShopSettings } from "@/lib/settings";

/**
 * Reads every setting in one query, filling unwritten keys from the defaults.
 *
 * Memoised per request: the root layout, its metadata and viewport, the
 * header, the footer and most pages each ask for the settings on their own,
 * and without this a single page view cost ten identical queries. Outside a
 * render (a script, a test) `cache` is a plain call.
 */
export const getShopSettings = cache(
  async (): Promise<ShopSettings> => parseSettings(await db.setting.findMany()),
);

/** Writes every setting. Keys are upserted, so the first save creates them. */
export async function saveShopSettings(settings: ShopSettings): Promise<void> {
  await db.$transaction(
    serializeSettings(settings).map(({ key, value }) =>
      db.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
    ),
  );
}
