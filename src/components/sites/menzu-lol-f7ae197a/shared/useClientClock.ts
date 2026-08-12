"use client";

import { useSyncExternalStore } from "react";

/**
 * One clock for the whole page.
 *
 * A page can hold several time-dependent readings at once — a top-up counting
 * down, a list of "5 phút trước" — and giving each its own interval means
 * several timers waking a moment apart, so the figures visibly disagree. They
 * share this one and tick together.
 *
 * Whole seconds rather than milliseconds because this is read as a snapshot:
 * it has to return the same value until it genuinely changes, or React has no
 * way to know when the subscription has settled.
 */
let nowSeconds = 0;
const listeners = new Set<() => void>();
let clock: number | null = null;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (clock === null) {
    nowSeconds = Math.floor(Date.now() / 1000);
    clock = window.setInterval(() => {
      nowSeconds = Math.floor(Date.now() / 1000);
      for (const notify of listeners) notify();
    }, 1000);
  }

  return () => {
    listeners.delete(listener);
    // Nothing on screen depends on the time any more; a tab left open in the
    // background should not keep a timer alive for it.
    if (listeners.size === 0 && clock !== null) {
      window.clearInterval(clock);
      clock = null;
    }
  };
}

/**
 * The current time in milliseconds, or null while that is not yet knowable.
 *
 * Null on the server, and null through hydration. Two clocks are involved and
 * they do not agree: the page may sit in transit for a while, and a visitor
 * whose own clock is ten minutes out would otherwise have the server and the
 * browser writing different text into the same element. Callers render a
 * placeholder until this returns a number.
 */
export function useClientNow(): number | null {
  const seconds = useSyncExternalStore(
    subscribe,
    () => nowSeconds,
    () => null,
  );
  return seconds === null ? null : seconds * 1000;
}
