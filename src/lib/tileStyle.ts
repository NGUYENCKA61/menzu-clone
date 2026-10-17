import {
  DEFAULT_TILE_STYLE,
  type TileStyle,
} from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/ProductRow";

/**
 * LAB: every game tile dress tried with the owner, under the names used in
 * the chat (A1 is "a", the first one "goc"), so any of them opens as ?kieu=a5
 * on the home page and on a category's page without changing the default
 * (17/10/2026: "xuất artifact cái đi", then "trang chi tiết danh mục làm đồng
 * bộ lại đi").
 */
export const TILE_STYLES: readonly TileStyle[] = [
  "classic", "a", "a2", "a3", "a4", "a5", "a6", "a6cu", "b", "b1", "b2", "b3", "b4", "b6", "c", "c1", "d",
];

/** The dress a ?kieu= value names, or the default for anything else. */
export function pickTileStyle(raw: string | string[] | undefined): TileStyle {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (value === "a1") return "a";
  if (value === "goc") return "classic";
  // B1 is B at A1's brightness; the first B is "bgoc". A5 shares A4's
  // brightness, so B5 is B4.
  if (value === "bgoc") return "b";
  if (value === "b5") return "b4";
  const known = TILE_STYLES.find((style) => style === value);
  return known ?? DEFAULT_TILE_STYLE;
}
