/**
 * Chrome shared by the category page's two search panels — the one over the
 * account grid and the one over the software grid.
 *
 * Kept in one place because the two stack on the same page whenever a category
 * sells both, and chips that had drifted apart would read as two different
 * controls doing the same job.
 *
 * Tailwind cannot see class names built from fragments, so every piece here
 * is a set of whole classes.
 *
 * The filter wears menzu's dress (the owner, 24/10/2026: "áp style bộ lọc
 * menzu qua đi"), measured off menzu.lol's category filter: 11px bold chips
 * on a 14px corner, 10px black segments in a 40px well, 10px black capitals
 * over each group, every grey neutral-800/700 at 40%; menzu's purple tint is
 * the shop's red here.
 */

/** A chip's shape, picked or not: 40px tall like a well, its words the
 *  segments' 10px black on trial (24/10/2026, "trạng thái về 10px cho đồng
 *  bộ thử"; menzu's chips are 11px bold, 39px from their padding). */
export const CHIP_SHAPE =
  "inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3.5 text-[10px] font-black transition-colors";

/** A chip not picked, in either panel. The wells wear the same grey, so the
 *  loose chips and the segments read as one set ("màu bên phải đồng bộ màu
 *  bên trái lun đi"). */
export const CHIP_IDLE =
  "border-neutral-700/40 bg-neutral-800/40 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-800 hover:text-white";

/** A picked chip or segment in either panel: the accent at 20% under it and
 *  50% on its edge, the word in the accent itself (red since the owner's
 *  capture of 3100, "hiệu ứng đỏ này khi chọn thành phần trong bộ lọc đi"). */
export const CHIP_PICKED =
  "border-[var(--menzu-accent)]/50 bg-[var(--menzu-accent)]/20 text-[var(--menzu-accent)]";

/* The two panels stack on one page when a category sells both, so they share
 * these rather than drifting apart again. */
export const CHIP_INACTIVE = `press ${CHIP_SHAPE} ${CHIP_IDLE}`;

export const CHIP_ACTIVE = `press ${CHIP_SHAPE} ${CHIP_PICKED}`;

/** The hairline between two groups sharing a row ("đường kẻ | giữa"). Only
 *  where they do share one; stacked on a phone, the gap is enough. */
export const GROUP_DIVIDER = "hidden lg:block w-px self-stretch bg-white/10";

/** The small grey caption over each group of chips: menzu's 10px black
 *  capitals, set in by 4px ("in hoa như 3100 thử", then menzu's). */
export const GROUP_LABEL_CLASS =
  "text-[10px] uppercase font-black tracking-wider text-neutral-500 mb-1.5 ml-1 block";

/** The sunken card the chip rows sit in. Its edge is the product cards'
 *  white 10%, so the box and the grid under it read as one kind of block
 *  (24/10/2026; menzu's neutral-800/40 all but vanished next to them). */
export const PANEL_CLASS =
  "bg-neutral-900/35 border border-white/10 rounded-2xl p-3.5 md:p-4 flex flex-col gap-4";

/**
 * The rounded well a search input sits in, lighting up on focus. rounded-3xl
 * rather than the xl it used to be: the original gives both of its search
 * boxes a 24px radius, and at 12px they read as form fields instead of the
 * pills they are meant to be.
 */
export const SEARCH_SHELL_CLASS =
  "flex items-center gap-2 h-[50px] px-4 rounded-3xl bg-neutral-900/60 border border-neutral-800/60 focus-within:border-[var(--menzu-accent)]/60 transition-colors";

/**
 * The primary field's shell — same size and radius, different skin. The
 * original sets this one a 1.5px red hairline over near-black, where the box
 * beside it gets grey over a lighter grey. It is the field with the reticle and
 * the sweep in it, and the warm border is part of that, not an accident of
 * whatever the glow happened to be doing when the screenshot was taken.
 */
export const SCOPE_SHELL_CLASS =
  "flex items-center gap-2 h-[50px] px-4 rounded-3xl bg-[#111] border-[1.5px] border-[rgba(239,68,68,0.2)] transition-colors focus-within:border-[var(--menzu-accent)]/60";

export const SEARCH_INPUT_CLASS =
  "flex-1 bg-transparent outline-none text-white placeholder-neutral-400 text-sm transition-colors";
