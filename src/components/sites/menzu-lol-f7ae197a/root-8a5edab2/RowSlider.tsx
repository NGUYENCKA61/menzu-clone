"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Milliseconds a set of tiles rests before the next step. */
const STEP_MS = 3000;

/** How long a touch keeps the clock stopped after the finger lifts. */
const TOUCH_REST_MS = 6000;

/**
 * A row of tiles that slides one tile to the left on a beat until the last
 * tile is in view, then glides all the way back to the start and goes again
 * — driven by hand too, with a swipe or the dots below it.
 *
 * The same rhythm the account card's skin strip keeps — a step, a rest, a
 * step, then home — rather than a marquee that never stops, because these
 * tiles are links: a reader needs them to hold still long enough to aim at
 * one, and the run back to the start is what says "that was all of them".
 *
 * The viewport is a real scroll container with snap points, the grammar the
 * flash-sale and similar-tools strips already use: a finger can swipe it,
 * the swipe has the system's own momentum and settles on a tile, and the
 * clock moves it with scrollTo rather than a transform. It was a clipped
 * box moved by translateX before, which a phone could neither swipe nor
 * stop — a card would walk away under the finger reaching for it. A touch
 * stops the clock before anything else happens (scrolling under a finger
 * still on the screen makes Android drop the gesture and the strip jump),
 * and it stays stopped for six seconds after the last touch.
 *
 * Tile width and gap are CSS variables the viewport sets per breakpoint (in
 * a container query unit, so they follow the row's own width). The tiles
 * are cut a little short of the row, so a sliver of the next one shows at
 * the right edge under a fade — the row says "there is more" before anyone
 * touches it. How many tiles fit is measured on each move.
 *
 * Under the row, one dot per position, read from where the strip actually
 * is; the current one is drawn long and fills over the length of a beat, so
 * the reader can see the strip is on a clock and where it is. A press on a
 * dot restarts the clock. Holds still under the pointer, a keyboard focus,
 * or a finger. Readers who asked for less motion get a strip that never
 * steps on its own and jumps rather than glides when driven.
 */
export function RowSlider({ count, children }: { count: number; children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  /** Where the strip stands, read back from its scroll position. */
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  /** Bumped by every dot press and every clock step; the fill restarts. */
  const [beat, setBeat] = useState(0);
  /** Highest index the strip can stand on at the row's current width. */
  const [last, setLast] = useState(0);
  const touchRest = useRef<number | null>(null);

  /** One tile plus one gap: the distance a step covers. */
  const stepWidth = useCallback(() => {
    const track = trackRef.current;
    const first = track?.firstElementChild;
    if (!track || !(first instanceof HTMLElement)) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return first.getBoundingClientRect().width + gap;
  }, []);

  const measureLast = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const first = track?.firstElementChild;
    if (!viewport || !track || !(first instanceof HTMLElement)) return 0;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const tile = first.getBoundingClientRect().width;
    // Floor, not round: with the peek the fifth tile is only a sliver, and
    // a sliver does not count as in view.
    const visible = Math.max(1, Math.floor((viewport.clientWidth + gap) / (tile + gap)));
    return Math.max(0, count - visible);
  }, [count]);

  // The dots need the count of positions before anyone presses anything, and
  // again whenever the row changes width.
  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;
    const update = () => setLast(measureLast());
    update();
    // The track as well as the viewport: a tile can change width without the
    // row doing so — a breakpoint, or the stylesheet landing after the first
    // paint — and the dots must follow.
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measureLast]);

  // The dots follow the strip, whoever moved it — the clock, a dot, or a
  // finger. Passive, and only a state update per event: React batches them.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const onScroll = () => {
      const step = stepWidth();
      if (!step) return;
      const end = measureLast();
      setIndex(Math.max(0, Math.min(end, Math.round(viewport.scrollLeft / step))));
    };
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, [stepWidth, measureLast]);

  /** Slide to a position; anything past the end lands on the start. */
  const go = useCallback(
    (target: number) => {
      const viewport = viewportRef.current;
      const step = stepWidth();
      if (!viewport || !step) return;
      const end = measureLast();
      setLast(end);
      const next = target > end ? 0 : target < 0 ? end : target;
      // Past the last snap point the container simply stops at its end, so
      // the final stop is flush with the row's edge rather than on a gap.
      viewport.scrollTo({
        left: next * step,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    [stepWidth, measureLast],
  );

  useEffect(() => {
    if (held || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const viewport = viewportRef.current;
      const step = stepWidth();
      if (!viewport || !step) return;
      // Read from the strip itself, not from state: a swipe may have moved
      // it since the last render.
      const end = measureLast();
      const current = Math.round(viewport.scrollLeft / step);
      go(current >= end ? 0 : current + 1);
      setBeat((b) => b + 1);
    }, STEP_MS);
    return () => window.clearInterval(timer);
    // `beat` is here on purpose: a press restarts the interval.
  }, [held, count, stepWidth, measureLast, go, beat]);

  const press = (target: number) => {
    go(target);
    setBeat((b) => b + 1);
  };

  /** A finger on the strip stops the clock, now and for a while after. */
  const touch = () => {
    setHeld(true);
    if (touchRest.current !== null) window.clearTimeout(touchRest.current);
    touchRest.current = window.setTimeout(() => {
      touchRest.current = null;
      setHeld(false);
      // The fill and the clock start together again.
      setBeat((b) => b + 1);
    }, TOUCH_REST_MS);
  };

  useEffect(
    () => () => {
      if (touchRest.current !== null) window.clearTimeout(touchRest.current);
    },
    [],
  );

  return (
    <div className={held ? "row-slider-held" : undefined}>

      {/* --peek is the sliver of the next tile left showing; the fade is a
          mask so it works over the page's artwork, not only over flat black.
          The left fade only exists once something has slid out that way.
          overscroll-x-contain matters: without it a swipe past the end
          hands the gesture to the system, which reads it as "back". */}
      <div
        ref={viewportRef}
        className={`row-slider-viewport hide-scrollbar @container w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [--gap:1rem] [--peek:28px] sm:[--gap:1.5rem] sm:[--peek:40px] [--tile-w:calc((100cqw-1rem-var(--peek))/2)] md:[--tile-w:calc((100cqw-3rem-var(--peek))/3)] lg:[--tile-w:calc((100cqw-4.5rem-var(--peek))/4)] ${
          index > 0
            ? "[mask-image:linear-gradient(to_right,transparent,black_40px,black_calc(100%-72px),transparent)]"
            : "[mask-image:linear-gradient(to_right,black_calc(100%-72px),transparent)]"
        }`}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => {
          if (touchRest.current === null) setHeld(false);
        }}
        onFocus={() => setHeld(true)}
        onBlur={() => {
          if (touchRest.current === null) setHeld(false);
        }}
        onTouchStart={touch}
        onTouchEnd={touch}
      >
        <div ref={trackRef} className="row-slider-track flex w-max gap-[var(--gap)]">
          {children}
        </div>
      </div>

      {last > 0 ? (
        <div className="mt-5 flex items-center justify-center" role="tablist" aria-label="Vị trí">
          {Array.from({ length: last + 1 }, (_, position) => {
            const current = position === index;
            return (
              // The dot a finger has to hit is 6px tall and was 6px wide, with
              // 8px between it and the next — far under the 24px a touch
              // target needs, so on a phone this row was a line of near-misses.
              // The button is now a 24px-tall box with its own padding and the
              // dot drawn inside it: the same picture, a target three times
              // the size, and no gap needed because the padding is the gap.
              <button
                key={position}
                type="button"
                role="tab"
                aria-selected={current}
                aria-label={`Vị trí ${position + 1}`}
                onClick={() => press(position)}
                // px-2.5 rather than px-1: 6px of dot plus 20px of padding is
                // the 24px a touch target needs, and the padding doubles as
                // the spacing between them.
                className="group/dot flex h-6 items-center px-2.5"
              >
                <span
                  aria-hidden
                  className={`relative block h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-300 ${
                    current
                      ? "w-8 bg-white/15"
                      : "w-1.5 bg-white/20 group-hover/dot:bg-white/40"
                  }`}
                >
                  {current ? (
                    // Remounted on every beat so the fill starts from zero
                    // with the clock, wherever the strip happens to stand.
                    <span
                      key={beat}
                      className="row-slider-progress absolute inset-0 rounded-full bg-[var(--menzu-accent)]"
                      style={{ ["--row-slider-step" as string]: `${STEP_MS}ms` }}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
