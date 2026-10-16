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
export const SHEET_BUTTON_QUIET =
  "inline-flex h-11 items-center justify-center rounded-[10px] border border-line bg-raise px-4 text-[15px] font-medium text-frost transition-colors hover:bg-white/[0.07]";
