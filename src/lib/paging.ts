/**
 * Paging arithmetic, shared by every admin list.
 *
 * One implementation on purpose: the orders screen and the users screen show
 * the same strip of page buttons and the same "Hiển thị 1–20 / 356" line, and
 * two copies of this would drift into disagreeing about what the last page is.
 */

/**
 * Rows per page across the admin lists.
 *
 * One number for every list on purpose: an admin who has learned that a page
 * holds ten should not have to relearn it on the next screen. Split it into
 * per-screen constants only when a screen genuinely needs a different answer.
 */
export const PER_PAGE = 10;

/** Reads `?page=`, clamped to something that exists. */
export function parsePage(raw: string | undefined, totalPages: number): number {
  const n = Number(raw ?? 1);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.floor(n)), Math.max(1, totalPages));
}

/**
 * Which page numbers to draw, centred on the current one.
 *
 * A shop with sixty pages cannot have sixty buttons, and dropping to "‹ ›"
 * alone costs the admin the ability to jump. This keeps a fixed-width window
 * that slides, and stays anchored at either end rather than shrinking there.
 */
export function pageWindow(current: number, totalPages: number, span = 5): number[] {
  const total = Math.max(1, totalPages);
  const size = Math.min(span, total);
  let start = current - Math.floor(size / 2);
  start = Math.max(1, Math.min(start, total - size + 1));
  return Array.from({ length: size }, (_, i) => start + i);
}

/** "Hiển thị 1–20 / 356" — the numbers, not the sentence. */
export function pageRange(
  page: number,
  perPage: number,
  matching: number,
): { from: number; to: number } {
  if (matching === 0) return { from: 0, to: 0 };
  const from = (page - 1) * perPage + 1;
  return { from, to: Math.min(page * perPage, matching) };
}

/** A gap in the page strip, standing in for pages nobody is going to click. */
export const GAP = "…" as const;

/**
 * The page strip, with the first and last page always reachable.
 *
 * `pageWindow` alone strands the ends: on page 30 of 65 there is no way to
 * reach page 65 except by clicking through, and "go to the last page" is one
 * of the two jumps anybody actually wants. This keeps the sliding window and
 * pins 1 and the last page either side of a gap.
 *
 * The gap is only drawn where it hides something. A strip reading "1 … 2" is
 * a lie about what is between them.
 */
export function pageStrip(
  current: number,
  totalPages: number,
  span = 5,
): (number | typeof GAP)[] {
  const total = Math.max(1, totalPages);
  const window = pageWindow(current, total, span);
  const out: (number | typeof GAP)[] = [];

  const first = window[0]!;
  if (first > 1) {
    out.push(1);
    // Only a gap when page 2 is not already the next thing shown.
    if (first > 2) out.push(GAP);
  }

  out.push(...window);

  const last = window[window.length - 1]!;
  if (last < total) {
    if (last < total - 1) out.push(GAP);
    out.push(total);
  }

  return out;
}

/** Total pages for a count, never fewer than one. */
export function pageCount(matching: number, perPage: number = PER_PAGE): number {
  return Math.max(1, Math.ceil(matching / perPage));
}
