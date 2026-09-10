"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * A grid whose cards move the way lmarket.net's testimonial wall moves: they
 * rise in one after another the first time the grid scrolls into view (the
 * reviews' stars pop in after), and under the pointer each card shows a soft
 * accent glow that follows the cursor. The home reviews and the partner
 * strip both use it.
 *
 * Nothing here draws. Once mounted the wrapper marks itself `data-reveal`
 * (so a page without JavaScript shows every card at rest, nothing hidden
 * waiting for a script) and `data-inview` the first time it is seen;
 * globals.css animates `.reveal-card` and `.reveal-star` off those two
 * attributes. The glow reads `--spot-x`/`--spot-y` on each card, set from
 * one mousemove listener on the grid.
 */
export function RevealGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Layout effect, not effect: the attribute that hides the cards has to
  // land before the browser paints, or a grid already on screen is drawn
  // at rest for one frame, hidden, then revealed - a blink. A grid already
  // in view is marked seen in the same pass, for the same reason.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.dataset.reveal = "";
    if (
      typeof IntersectionObserver === "undefined" ||
      node.getBoundingClientRect().top < window.innerHeight
    ) {
      node.dataset.inview = "";
      return;
    }
    // Fires when the grid's top edge crosses 88% of the way down the
    // screen. The old threshold of 0.15 was a share of the grid's own
    // area, meaningless for a grid taller than the screen: on a phone the
    // FAQ's reveal ran while the grid was still below the fold.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        node.dataset.inview = "";
        observer.disconnect();
      },
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={(event) => {
        const card = (event.target as HTMLElement).closest<HTMLElement>("[data-spot]");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      }}
    >
      {children}
    </div>
  );
}
