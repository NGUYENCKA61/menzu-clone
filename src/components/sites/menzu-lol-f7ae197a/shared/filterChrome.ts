/**
 * Chrome shared by the category page's two search panels — the one over the
 * account grid and the one over the software grid.
 *
 * Kept in one place because the two stack on the same page whenever a category
 * sells both, and chips that had drifted apart would read as two different
 * controls doing the same job.
 *
 * Tailwind cannot see class names built from fragments, so every piece here
 * is a set of whole classes (the chips join pillTab's whole-class pieces).
 */

import { PILL_TAB_OFF, PILL_TAB_ON, PILL_TAB_SM } from "./pillTab";

/*
 * The account panel's chips light as the tool panel's and the /thong-bao tabs
 * do: the small tab pill, solid red when picked, grey when not (the owner,
 * 13/10/2026, UI consistency review). The two panels stack on one page when a
 * category sells both, so they share these rather than drifting apart again.
 */
export const CHIP_INACTIVE = `press ${PILL_TAB_SM} ${PILL_TAB_OFF}`;

export const CHIP_ACTIVE = `press ${PILL_TAB_SM} ${PILL_TAB_ON}`;

/** The hairline between two groups sharing a row ("đường kẻ | giữa"). Only
 *  where they do share one; stacked on a phone, the gap is enough. */
export const GROUP_DIVIDER = "hidden lg:block w-px self-stretch bg-white/10";

/** The small grey caption over each group of chips. */
export const GROUP_LABEL_CLASS =
  "text-[12px] font-semibold text-neutral-500 mb-1.5 block";

/** The sunken card the chip rows sit in. */
export const PANEL_CLASS =
  "bg-neutral-900/35 border border-neutral-800/40 rounded-2xl p-3.5 md:p-4 flex flex-col gap-4";

/**
 * The rounded well a search input sits in, in every search box's colours
 * (the wiki's: 5% fill, 10% rim, 8% on hover, the accent on focus; the owner,
 * 19/10/2026, one look for every search bar). rounded-3xl
 * rather than the xl it used to be: the original gives both of its search
 * boxes a 24px radius, and at 12px they read as form fields instead of the
 * pills they are meant to be.
 */
export const SEARCH_SHELL_CLASS =
  "flex items-center gap-2 h-[50px] px-4 rounded-3xl bg-white/5 border border-white/10 transition-[border-color,box-shadow,background-color] hover:bg-white/[0.08] focus-within:border-[var(--menzu-accent)]/60 focus-within:bg-white/[0.08] focus-within:ring-2 focus-within:ring-[var(--menzu-accent)]/25";

/**
 * The primary field's shell: same size and radius, and since 19/10/2026 the
 * same colours as every search box (it had menzu's 1.5px red hairline over
 * near-black). The breathing red ring (search-glow-brand) still marks it as
 * the field with the reticle and the sweep in it; no focus ring, as that
 * glow's box-shadow would paint over one.
 */
export const SCOPE_SHELL_CLASS =
  "flex items-center gap-2 h-[50px] px-4 rounded-3xl bg-white/5 border-[1.5px] border-white/10 transition-[border-color,background-color] hover:bg-white/[0.08] focus-within:border-[var(--menzu-accent)]/60 focus-within:bg-white/[0.08]";

export const SEARCH_INPUT_CLASS =
  "flex-1 bg-transparent outline-none text-white placeholder-neutral-400 text-sm transition-colors";
