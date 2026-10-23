/**
 * LAB: one look for every notice sheet, so the shop's notices, the error and
 * done sheets and the closed wheel read as one family (the owner, 16/10/2026:
 * "thiết kế lại cái modal thông báo cho đồng bộ", after "bớt AI bớt rối").
 * A plain panel with a hairline, the title left aligned with a small glyph,
 * grey text, red only on the one button that acts.
 */
export const SHEET =
  "relative w-full rounded-2xl border border-line bg-panel shadow-2xl shadow-black/60";
export const SHEET_TITLE =
  "flex items-center gap-2.5 text-[18px] font-bold leading-snug text-frost";
export const SHEET_TEXT = "text-[15px] leading-relaxed text-mist";
export const SHEET_BUTTON =
  "inline-flex h-11 items-center justify-center rounded-[10px] bg-[var(--menzu-accent)] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[var(--menzu-accent-dark)]";
/**
 * The centred cut the owner chose for the top-up sheet (23/10/2026, "như
 * menzu mà màu đỏ", "trắng thì nút", "như này đi") and then for the other
 * one-button notices: a tile with the glyph, the title, one sentence, one
 * white button across the sheet.
 */
export const SHEET_HEAD = "flex flex-col items-center pt-4 text-center";
export const SHEET_TILE = "grid h-16 w-16 place-items-center rounded-2xl border";
export const SHEET_TILE_OK = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
export const SHEET_TILE_BAD = "border-rose-500/30 bg-rose-500/10 text-rose-400";
export const SHEET_TILE_QUIET = "border-white/10 bg-white/[0.05] text-mist";
export const SHEET_TITLE_CENTRED = "mt-5 text-[22px] font-bold leading-snug text-frost";
export const SHEET_TEXT_CENTRED = "mt-2 text-[15px] leading-relaxed text-mist";
export const SHEET_BUTTON_WHITE =
  "inline-flex h-11 items-center justify-center rounded-[10px] bg-white px-5 text-[14px] font-semibold text-black transition-colors hover:bg-neutral-200";
export const SHEET_BUTTON_QUIET =
  "inline-flex h-11 items-center justify-center rounded-[10px] border border-line bg-raise px-4 text-[15px] font-medium text-frost transition-colors hover:bg-white/[0.07]";
