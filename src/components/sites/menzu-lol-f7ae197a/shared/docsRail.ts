/**
 * The left menu both reading areas draw, the Wiki (/docs) and Tài liệu
 * (/tai-lieu), written once so the two read as one site (the owner,
 * 13/10/2026, UI consistency review: the two menus looked like two different
 * sites). The Wiki's menu is the model: a dark box, a small grey label over
 * each group, 14px bold rows with a glyph in front, and one open state, a
 * red tint with a red bar on its left edge and a red glyph.
 *
 * Plain strings in a module of their own: the Wiki's menu is a client
 * component and Tài liệu's a server one, and both import from here.
 */

export const DOCS_RAIL_BOX = "rounded-2xl border border-white/10 bg-[#121216] p-3";

/** The grey word over a group of rows ("Danh mục", "Bắt đầu", ...). */
export const DOCS_RAIL_LABEL =
  "mb-2 block px-2 text-[12px] font-semibold text-neutral-500";

/** Every row, open or not; add DOCS_RAIL_ROW_ON or DOCS_RAIL_ROW_OFF. */
export const DOCS_RAIL_ROW =
  "relative flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition-colors";
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
