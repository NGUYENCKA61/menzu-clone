/**
 * Pure shaping rules for the configurable home-page sections.
 *
 * No database here, so the rules can be tested directly — reading the rows
 * lives in `homeRows.ts`.
 */

/**
 * Splits a category name across the tile's two lines.
 *
 * The tile sets its last line at 64px and the line above it at 28px, which is
 * a shape, not a label: "ACC TỰ CHỌN / VALORANT". A configured category has
 * one name and no such split, so the last word becomes the big line — for this
 * catalogue that lands on the game or the grade, which is the word the shape
 * was built to shout. A single-word name goes wholly to the big line.
 *
 * Every word survives. A long last word simply wraps, which the big line
 * allows; dropping it to protect the layout would silently rename a category.
 */
export function splitTileName(name: string): { line1: string; line2: string } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { line1: "", line2: "" };
  if (words.length === 1) return { line1: "", line2: words[0]! };
  return { line1: words.slice(0, -1).join(" "), line2: words[words.length - 1]! };
}

/**
 * Orders rows to match a list of slugs and drops anything not asked for.
 *
 * The admin screen stores the display order as the order of the slug list, so
 * the query's own ordering is discarded here rather than in each caller. A
 * slug naming a row that no longer exists is skipped, which is what happens
 * when a category is deleted while still pinned to the home page.
 */
export function orderBySlugs<T extends { slug: string }>(rows: T[], slugs: string[]): T[] {
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((row): row is T => row !== undefined);
}
