"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The reviews grid's motion, the way lmarket.net's testimonial wall moves:
 * the cards rise in one after another the first time the grid scrolls into
 * view, their stars pop in after, and under the pointer each card shows a
 * soft accent glow that follows the cursor.
 *
 * Nothing here draws. Once mounted the wrapper marks itself `data-reveal`
 * (so a page without JavaScript shows every card at rest, nothing hidden
 * waiting for a script) and `data-inview` the first time it is seen;
 * globals.css animates `.reveal-card` and `.reveal-star` off those two
 * attributes. The glow reads `--spot-x`/`--spot-y` on each card, set from
 * one mousemove listener on the grid.
 */
export function ReviewsReveal({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.dataset.reveal = "";
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.inview = "";
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        node.dataset.inview = "";
        observer.disconnect();
      },
      { threshold: 0.15 },
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
