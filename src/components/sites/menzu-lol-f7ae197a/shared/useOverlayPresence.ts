"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * How long an overlay's exit runs. The card takes 150ms; the backdrop
 * starts 60ms later and takes 120ms, so it is the last thing to go and the
 * card never floats over a page that has already come back. Matches
 * order-modal-out / order-backdrop-out in globals.css.
 */
export const OVERLAY_OUT_MS = 180;

const LESS_MOTION = "(prefers-reduced-motion: reduce)";

/** The exit's length for this reader — none at all for one who asked for less. */
function outMs(): number {
  return window.matchMedia(LESS_MOTION).matches ? 0 : OVERLAY_OUT_MS;
}

/**
 * Keeps an overlay in the DOM for the length of its exit.
 *
 * `open` is what the owner wants. `mounted` is what the tree should hold:
 * it follows `open` up at once — adjusted during render, so the very first
 * frame has the card — and trails it down by the exit's length. `leaving`
 * is true in between, and is what the exit classes hang on.
 *
 * Every overlay on the site had an entrance and none had an exit: press
 * Huỷ, press Escape, press the backdrop, and the card, the dark and the blur
 * all vanished in one frame. The exit is shorter than the entrance on
 * purpose (150 against 250): the reader has already decided.
 *
 * Whatever the owner does on `open` going false — unlocking the page,
 * handing focus back — keeps happening at that moment, at the START of the
 * exit, not at unmount; a keyboard should never be a beat behind.
 */
export function useOverlayPresence(open: boolean): {
  mounted: boolean;
  leaving: boolean;
} {
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  const leaving = shown && !open;

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setShown(false), outMs());
    return () => window.clearTimeout(timer);
  }, [leaving]);

  return { mounted: shown, leaving };
}

/**
 * For an overlay its owner mounts and unmounts itself — the error sheet,
 * the top-up receipt, the wheel's result, the toast: the overlay asks to
 * leave, plays its exit, then tells the owner. Every close control calls
 * `leave` where it called `onClose`. `leave` is stable, so an effect may
 * list it without re-running on every render; the latest `onClose` is read
 * when the exit ends.
 */
export function useLeave(onClose: () => void): {
  leaving: boolean;
  leave: () => void;
} {
  const [leaving, setLeaving] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => {
      closeRef.current();
      // Reset for an owner that keeps this component mounted and opens
      // the same overlay again (the wheel's result card); for one that
      // unmounts it this update simply goes nowhere.
      setLeaving(false);
    }, outMs());
    return () => window.clearTimeout(timer);
  }, [leaving]);

  const leave = useCallback(() => setLeaving(true), []);
  return { leaving, leave };
}
