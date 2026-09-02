/**
 * Matching typed text against names, for the search boxes a customer uses.
 *
 * Two things a Vietnamese shop's search has to survive: nobody types the
 * accents ("valorant" for "Valorant", "sap het hang" for "sắp hết hàng"), and
 * nobody agrees on the spaces ("hackpubg", "hack pubg", "hack  PUBG"). So both
 * sides are folded down to bare letters and digits before they are compared,
 * and the words the reader typed are matched one at a time rather than as one
 * string — "pubg desync" should find "Hack PUBG Bản DESYNC" even though those
 * words are not adjacent in it.
 */

/** Lowercased, accents dropped, everything but letters and digits removed. */
export function foldSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Whether every word of `query` appears somewhere in `fields`.
 *
 * An empty query matches everything — a search box nobody has typed in yet is
 * not a filter, and starting with an empty list would hide the very thing the
 * reader came to browse.
 */
export function matchesSearch(query: string, fields: string[]): boolean {
  const terms = query.split(/\s+/).map(foldSearch).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = fields.map(foldSearch).join(" ");
  return terms.every((term) => hay.includes(term));
}
