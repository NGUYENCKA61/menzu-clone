/**
 * The /thong-bao buttons: the page's three tabs, and the subscribe tab's
 * "Tất cả / Đang theo dõi" filter under them, wear the same button — one
 * height, one radius, one type, the same count chip, solid red when lit
 * (the owner, 01/10/2026: "cái phần lọc cảm giác chưa đồng bộ").
 */
export const NOTICE_TAB =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border px-4 text-[11px] font-black uppercase tracking-widest transition-colors";
export const NOTICE_TAB_ON = "border-[var(--menzu-accent)] bg-[var(--menzu-accent)] text-white";
export const NOTICE_TAB_OFF =
  "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white";
/** The count inside a tab. */
export const NOTICE_TAB_COUNT = "rounded-md bg-black/20 px-1.5 py-0.5 text-[10px]";
