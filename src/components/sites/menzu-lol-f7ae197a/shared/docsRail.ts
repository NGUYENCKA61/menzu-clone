/**
 * The left menu both reading areas draw, the Wiki (/docs) and Tài liệu
 * (/tai-lieu), written once so the two read as one site (the owner,
 * 13/10/2026, UI consistency review: the two menus looked like two different
 * sites). The Wiki's menu is the model: a dark box, a small grey label over
 * each group, 14px rows with a glyph in front, and one open state, a
 * red tint with a red bar on its left edge and a red glyph.
 *
 * Plain strings in a module of their own: the Wiki's menu is a client
 * component and Tài liệu's a server one, and both import from here.
 */

/** Filled like the cards beside it (the articles, the FAQ, /feedback's
 *  reviews), 2% white over the ground. A solid #121216 sat a step off the
 *  #111111 ground and read as a dark hole beside them (the owner,
 *  18/10/2026: "thấy tối quá hả cái card"). */
export const DOCS_RAIL_BOX = "rounded-2xl border border-white/10 bg-white/[0.02] p-3";

/** The grey word over a group of rows ("Danh mục", "Bắt đầu", ...), at
 *  the labels' 500 on Tổng quan where it was 600 (26/10/2026, lab 3200). */
export const DOCS_RAIL_LABEL =
  "mb-2 block px-2 text-[12px] font-medium text-neutral-500";

/** Every row, open or not; add DOCS_RAIL_ROW_ON or DOCS_RAIL_ROW_OFF. At
 *  the account menu's 600 where it was 700 (26/10/2026, lab 3200). */
export const DOCS_RAIL_ROW =
  "relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-colors";
export const DOCS_RAIL_ROW_ON =
  "border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/10 text-white";
export const DOCS_RAIL_ROW_OFF =
  "border-transparent text-neutral-400 hover:bg-white/5 hover:text-white";

/** The red bar on the open row's left edge, drawn inside the row. */
export const DOCS_RAIL_BAR =
  "absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-[var(--menzu-accent)]";

/** The 16px glyph in front of a row: red on the open row, grey otherwise. */
export function docsRailIcon(on: boolean): string {
  return `shrink-0 ${on ? "text-[var(--menzu-accent)]" : "text-neutral-500"}`;
}
