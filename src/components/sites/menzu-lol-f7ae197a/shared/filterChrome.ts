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
  "press px-3 py-1.5 rounded-lg text-[11px] font-bold border border-neutral-800/60 bg-neutral-950/40 text-neutral-400 hover:text-white hover:border-neutral-700 whitespace-nowrap";

export const CHIP_ACTIVE =
  "press px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)] whitespace-nowrap";

export const CHIP_DISABLED =
  "px-3 py-1.5 rounded-lg text-[11px] font-bold border border-neutral-800/60 bg-neutral-950/40 text-neutral-600 cursor-not-allowed whitespace-nowrap";

/**
 * The tool filter's own chips, measured off the original's category panel
 * (the owner, 07/10/2026: "sửa lại phần lọc … theo menzu có đường kẻ |
 * giữa"): a quick-pick pill 40px tall at a 14px radius, and a segmented
 * choice — options side by side in one rounded well, 32px segments at 10px
 * black — for the short either-or groups. The lit state wears the shop's
 * red where the original wears its violet.
 */
export const PILL =
  "press h-10 px-3.5 rounded-[14px] text-[11px] font-bold border border-neutral-700/40 bg-neutral-800/40 text-neutral-400 transition-colors hover:text-white hover:border-neutral-600 whitespace-nowrap";

export const PILL_ACTIVE =
  "press h-10 px-3.5 rounded-[14px] text-[11px] font-bold border border-[var(--menzu-accent)]/50 bg-[var(--menzu-accent)]/15 text-[var(--menzu-accent)] whitespace-nowrap";

/** The rounded well a segmented choice sits in. */
export const SEGMENTS =
  "inline-flex h-10 items-center gap-1 rounded-[14px] border border-neutral-700/40 bg-neutral-800/40 p-1";

export const SEGMENT =
  "press h-8 px-3 rounded-[10px] border border-transparent text-[10px] font-black text-neutral-400 transition-colors hover:text-white whitespace-nowrap";

export const SEGMENT_ACTIVE =
  "press h-8 px-3 rounded-[10px] border border-[var(--menzu-accent)]/50 bg-[var(--menzu-accent)]/20 text-[10px] font-black text-[var(--menzu-accent)] whitespace-nowrap";

/** The hairline between two groups sharing a row ("đường kẻ | giữa"). Only
 *  where they do share one; stacked on a phone, the gap is enough. */
export const GROUP_DIVIDER = "hidden lg:block w-px self-stretch bg-white/10";

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
  "flex items-center gap-2 h-[50px] px-4 rounded-3xl bg-[#111] border-[1.5px] border-[rgba(239,68,68,0.2)] transition-colors focus-within:border-[var(--menzu-accent)]/60";

export const SEARCH_INPUT_CLASS =
  "flex-1 bg-transparent outline-none text-white placeholder-neutral-400 text-sm transition-colors";
