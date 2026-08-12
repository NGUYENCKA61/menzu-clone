/**
 * Paging arithmetic, shared by every admin list.
 *
 * One implementation on purpose: the orders screen and the users screen show
 * the same strip of page buttons and the same "Hiển thị 1–20 / 356" line, and
 * two copies of this would drift into disagreeing about what the last page is.
 */

/** Rows per page across the admin lists. */
export const PER_PAGE = 20;

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

/** Total pages for a count, never fewer than one. */
export function pageCount(matching: number, perPage: number = PER_PAGE): number {
  return Math.max(1, Math.ceil(matching / perPage));
}
