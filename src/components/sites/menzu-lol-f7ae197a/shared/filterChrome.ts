/**
 * Chrome shared by the category page's two search panels — the one over the
 * account grid and the one over the software grid.
 *
 * Kept in one place because the two stack on the same page whenever a category
 * sells both, and chips that had drifted apart would read as two different
 * controls doing the same job.
 *
 * Tailwind cannot see dynamically-composed class names, so each state is a
 * complete literal string rather than a base plus a modifier.
 */

export const CHIP_INACTIVE =
  "px-3 py-1.5 rounded-lg text-[11px] font-bold border border-neutral-800/60 bg-neutral-950/40 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors whitespace-nowrap";

export const CHIP_ACTIVE =
  "px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)] transition-colors whitespace-nowrap";

export const CHIP_DISABLED =
  "px-3 py-1.5 rounded-lg text-[11px] font-bold border border-neutral-800/60 bg-neutral-950/40 text-neutral-600 cursor-not-allowed whitespace-nowrap";

/** The small grey caption over each group of chips. */
export const GROUP_LABEL_CLASS =
  "text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 block";

/** The sunken card the chip rows sit in. */
export const PANEL_CLASS =
  "bg-neutral-900/35 border border-neutral-800/40 rounded-2xl p-3.5 md:p-4 flex flex-col gap-4";

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
  "flex items-center gap-2 h-[50px] px-4 rounded-3xl bg-[#111] border-[1.5px] border-[rgba(239,68,68,0.2)] transition-colors";

export const SEARCH_INPUT_CLASS =
  "flex-1 bg-transparent outline-none text-white placeholder-neutral-400 text-sm transition-colors";
