"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * A phone-only bar pinned just above the bottom nav, carrying what is being
 * bought, its price and the buy button.
 *
 * On a phone the page's real buttons sit under the gallery and the stats
 * and scroll away after the first swipe; the description, the features and
 * the install guide — the part that persuades — run on for screens below,
 * and by the end the button is a dozen swipes back up. The bar slides in
 * once the real buttons have left the visible band and slides out when
 * they return, so two red buttons are never on screen together. The band
 * is trimmed by the fixed header at the top and the nav plus this bar at
 * the bottom, so "visible" means visible, not merely inside the viewport.
 *
 * Nothing here decides anything: the button calls the same handler the
 * page's own does, and the price is whatever the panel is showing. A tier
 * change swaps the figure without ceremony — the reader just chose it.
 */
export function StickyBuyBar({
  anchorRef,
  label,
  price,
  cta,
  disabled = false,
  onPress,
}: {
  /** The page's own button cluster; the bar shows while it is off screen. */
  anchorRef: RefObject<HTMLElement | null>;
  /** What is being bought — the tier's name, or the account's. */
  label: string;
  /** Already formatted, with the đ. */
  price: string;
  cta: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = anchorRef.current;
    if (!node) return;
    // Only a phone has the bar at all (sm:hidden below), so the observer is
    // pointless from sm up — and the support bubble must not be lifted for
    // a bar nobody can see.
    const phone = window.matchMedia("(max-width: 639.98px)");
    const observer = new IntersectionObserver(
      ([entry]) => setShown(phone.matches && !entry.isIntersecting),
      // The header covers the top ~100px, the nav and this bar the bottom
      // ~128px: the buttons count as in view only inside the band between.
      { rootMargin: "-100px 0px -128px 0px", threshold: 0 },
    );
    observer.observe(node);
    const onChange = () => {
      if (!phone.matches) setShown(false);
    };
    phone.addEventListener("change", onChange);
    return () => {
      observer.disconnect();
      phone.removeEventListener("change", onChange);
    };
  }, [anchorRef]);

  // The support bubble sits in the same corner; while the bar is up the
  // stylesheet lifts the bubble by the bar's height (globals.css).
  useEffect(() => {
    if (!shown) return;
    document.body.setAttribute("data-buy-bar", "");
    return () => document.body.removeAttribute("data-buy-bar");
  }, [shown]);

  return (
    <div
      aria-hidden={!shown}
      inert={!shown}
      className={`fixed bottom-16 left-0 right-0 z-[60] flex items-center gap-3 border-t border-white/[0.08] bg-[#0a0a0d]/[0.97] px-4 py-2.5 transition-[transform,opacity] duration-[220ms] ease-out motion-reduce:transition-none sm:hidden ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold text-neutral-400">{label}</p>
        <p className="text-base font-black tabular-nums leading-tight text-white">{price}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onPress}
        className="press h-11 shrink-0 rounded-xl bg-[var(--menzu-accent)] px-6 text-[12px] font-black uppercase tracking-widest text-white hover:bg-[var(--menzu-accent-dark)] disabled:opacity-50"
      >
        {cta}
      </button>
    </div>
  );
}
