/**
 * The shop's one tab button: the /thong-bao tabs' pill, solid red when lit,
 * a quiet grey well when not, in the site's black caps. The home rows' filter
 * chips (Tất cả / PC / Mobile / Spoofer) speak the same language. Kept here so
 * every tab row and filter row on the site lights the same way (the owner,
 * 13/10/2026, UI consistency review): before this, /security tinted its tabs
 * pink and the category filter its chips paler still, so three controls doing
 * one job read as three different things.
 *
 * Moved out of noticeTabLook.ts, whose classes were the /thong-bao tabs'
 * alone (the owner, 01/10/2026: "cái phần lọc cảm giác chưa đồng bộ").
 *
 * A row is `${PILL_TAB} ${lit ? PILL_TAB_ON : PILL_TAB_OFF}`. Each piece is a
 * set of whole classes, so Tailwind still finds every one of them.
 */

/** Everything but the size: the shape, the type and the fade between states. */
export const PILL_TAB_FACE =
  "inline-flex shrink-0 items-center border font-black uppercase tracking-widest transition-colors";

/** The /thong-bao size: 40px tall, 11px caps. */
export const PILL_TAB = `${PILL_TAB_FACE} h-10 gap-2 rounded-xl px-4 text-[11px]`;

/** The small size, for chips in a filter panel: 32px tall, 10px caps. */
export const PILL_TAB_SM = `${PILL_TAB_FACE} h-8 gap-1.5 rounded-lg px-3 text-[10px]`;

/** Lit: the accent, filled, white words. */
export const PILL_TAB_ON = "border-[var(--menzu-accent)] bg-[var(--menzu-accent)] text-white";

/** Not lit: a grey well that brightens under the pointer. */
export const PILL_TAB_OFF =
  "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white";

/** A count inside a tab; dark enough to read on the red and on the grey. */
export const PILL_TAB_COUNT = "rounded-md bg-black/20 px-1.5 py-0.5 text-[10px]";
