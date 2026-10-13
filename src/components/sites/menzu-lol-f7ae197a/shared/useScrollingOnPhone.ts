"use client";

import { useEffect, useState } from "react";

/** How long the phone's button stays tucked after the last scroll event. */
const TUCK_SETTLE_MS = 800;

/** Below Tailwind's sm, the only width the round button floats over content. */
export const PHONE = "(max-width: 639.98px)";

/**
 * Whether the page is being scrolled right now on a phone: true from the
 * first scroll event until TUCK_SETTLE_MS after the last one.
 *
 * On a phone the round chat button floats over whatever is scrolling under
 * it, a price or a button half the time (the owner, 13/10/2026, UI
 * consistency review). While the reader scrolls it steps half out of the
 * way, and comes back once they stop. Passive listener, one timer, and no
 * state change at all on wider screens, where the tab sits on the window's
 * edge and covers nothing that matters.
 *
 * Shared by the customer's support bubble and the admin's warranty inbox,
 * which stand in the same corner and get in the same way.
 */
export function useScrollingOnPhone(): boolean {
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    const phone = window.matchMedia(PHONE);
    let timer: number | undefined;
    // Mirrors the state, so a fling's hundred events set it once.
    let on = false;
    const onScroll = () => {
      if (!phone.matches) return;
      if (!on) {
        on = true;
        setScrolling(true);
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        on = false;
        setScrolling(false);
      }, TUCK_SETTLE_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  return scrolling;
}
