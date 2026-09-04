/**
 * Which kind of thing a category sells, as the home page's "Danh sách hack
 * game" row filters it: a hack for the PC game, a hack for the mobile game,
 * or a spoofer.
 *
 * A short closed list rather than free text, so the filter chips can be
 * drawn before any category is tagged and a typo cannot invent a fourth
 * platform. Stored on the category as the value itself ("PC"), which is
 * also what the chip prints.
 */
export const CATEGORY_PLATFORMS = ["PC", "MOBILE", "SPOOFER", "DMA"] as const;

export type CategoryPlatform = (typeof CATEGORY_PLATFORMS)[number];

/**
 * What the chip and the admin's select print. The stored value stays a
 * single word; the one that is not its own label is the DMA / mạch shelf,
 * whose hardware the shop's customers know by both names.
 */
export function platformLabel(value: CategoryPlatform | string): string {
  return value === "DMA" ? "DMA / MẠCH" : value;
}

export function isCategoryPlatform(value: unknown): value is CategoryPlatform {
  return (
    typeof value === "string" &&
    (CATEGORY_PLATFORMS as readonly string[]).includes(value)
  );
}

/**
 * Reads what the admin picked. Blank clears — a category with no platform
 * shows under "Tất cả" only. Anything else is refused rather than stored.
 */
export function parsePlatform(
  value: unknown,
): { ok: true; value: CategoryPlatform | null } | { ok: false } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim().toUpperCase();
  if (trimmed === "") return { ok: true, value: null };
  return isCategoryPlatform(trimmed) ? { ok: true, value: trimmed } : { ok: false };
}
