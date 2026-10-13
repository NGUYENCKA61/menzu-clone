/*
 * The bottom-right widget's look, in one place: the customer's support bubble
 * (SupportWidget) and the admin's warranty inbox (AdminWarrantyInbox) stand in
 * the same corner, at the same size, in the same glass, so whichever one a
 * visitor gets reads as the same piece of the site.
 *
 * Whole class strings, never assembled from parts: Tailwind reads source text,
 * and a class built by joining fragments compiles to nothing at all.
 */

/**
 * Glass, in one place.
 *
 * Both surfaces — the panel and the tab under it — are the same material, so
 * they read as one object that happens to be hinged. The blur is what makes it
 * glass; the inset white hairline along the top is what makes the blur look
 * like a pane rather than a smudge, and it is the piece most often left out.
 */
export const GLASS =
  "border border-white/[0.12] bg-[#0b0b10]/70 backdrop-blur-2xl backdrop-saturate-150";

/**
 * The frame both widgets hang from.
 *
 * pointer-events-none on the frame, restored on each real control inside:
 * the frame is as tall as the panel plus the tab, and anything the page puts
 * in that corner would otherwise become unclickable. On a phone the bottom
 * edge belongs to the bottom nav (h-16, sm:hidden), so the whole thing lifts
 * above it; from sm up it hinges on the window edge. `support-frame` lifts it
 * again over the phone's sticky buy bar (globals.css).
 */
export const FRAME =
  "support-frame pointer-events-none fixed bottom-[calc(4rem+0.75rem)] right-3 z-[101] flex flex-col items-end sm:bottom-0 sm:right-4";

/** The panel's drop shadow and top hairline, over GLASS. */
export const PANEL_SHADOW =
  "shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.14)]";

/**
 * The launcher: a round button the size of a thumb on a phone, a tab hinged
 * on the window's bottom edge from sm up. Wears GLASS.
 */
export const LAUNCHER = `group flex h-14 w-14 items-center justify-center rounded-full text-left shadow-[0_12px_40px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)] transition-colors duration-200 hover:bg-[#14141c]/80 sm:h-auto sm:w-auto sm:min-w-[250px] sm:justify-start sm:gap-3 sm:rounded-none sm:rounded-t-[18px] sm:border-b-0 sm:px-3.5 sm:py-3 sm:shadow-[0_-12px_40px_-10px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.14)] ${GLASS}`;
