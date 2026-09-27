/**
 * The home page's own backdrop, drawn over the root layout's fixed artwork
 * (the same z-[-1], later in the stream), on lmarket.net's pattern (option
 * L1): no picture behind the page at all. The whole page sits on one flat
 * dark tone, the header's own #0f1015; the first screen alone gets depth
 * from a light in the shop's colour falling from the top and a faint grid
 * of dots that fades out before the rows of cards. The colour on the page
 * comes from the game covers, not from the background.
 *
 * Styles are the home-l1-* classes in globals.css.
 */
export function HomeBackdrop() {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1] bg-[#0f1015]" />
      <div aria-hidden className="home-l1-glow pointer-events-none absolute inset-x-0 top-0 z-[-1] h-[85svh]" />
      <div aria-hidden className="home-l1-grid pointer-events-none absolute inset-x-0 top-0 z-[-1] h-[100svh]" />
    </>
  );
}
