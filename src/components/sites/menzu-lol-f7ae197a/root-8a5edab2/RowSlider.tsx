"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/** Milliseconds a set of tiles rests before the next step. */
const STEP_MS = 3000;

/**
 * A row of tiles that slides one tile to the left on a beat until the last
 * tile is in view, then glides all the way back to the start and goes again
 * — driven by hand too, with the dots below it.
 *
 * The same rhythm the account card's skin strip keeps — a step, a rest, a
 * step, then home — rather than a marquee that never stops, because these
 * tiles are links: a reader needs them to hold still long enough to aim at
 * one, and the run back to the start is what says "that was all of them".
 *
 * Tile width and gap are CSS variables the viewport sets per breakpoint (in
 * a container query unit, so they follow the row's own width). The tiles
 * are cut a little short of the row, so a sliver of the next one shows at
 * the right edge under a fade — the row says "there is more" before anyone
 * touches it. On the last step the strip is clamped to its far end rather
 * than to a tile boundary, so the run finishes flush with the row's edge and
 * not on a gap. How many tiles fit is measured on each move.
 *
 * Under the row, one dot per position; the current one is drawn long and
 * fills over the length of a beat, so the reader can see the strip is on a
 * clock and where it is. A press on a dot restarts the clock. Holds still
 * under the pointer or a keyboard focus. Readers who asked for less motion
 * get a strip only the dots move.
 */
export function RowSlider({ count, children }: { count: number; children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  /** True while the strip is on its way back to the start — a longer glide. */
  const [rewinding, setRewinding] = useState(false);
  const [held, setHeld] = useState(false);
  /** Bumped by every dot press; the clock restarts from that moment. */
  const [beat, setBeat] = useState(0);
  /** Highest index the strip can stand on at the row's current width. */
  const [last, setLast] = useState(0);

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

  /** Jump to a position; anything past the end lands on the start. */
  const go = useCallback(
    (target: number) => {
      const end = measureLast();
      setLast(end);
      setIndex((current) => {
        const next = target > end ? 0 : target < 0 ? end : target;
        // The glide home and the wrap to the end are long moves; a step is short.
        setRewinding(Math.abs(next - current) > 1);
        return next;
      });
    },
    [measureLast],
  );

  useEffect(() => {
    if (held || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const end = measureLast();
      setLast(end);
      setIndex((current) => {
        const next = current >= end ? 0 : current + 1;
        setRewinding(next === 0);
        return next;
      });
    }, STEP_MS);
    return () => window.clearInterval(timer);
    // `beat` is here on purpose: a press restarts the interval.
  }, [held, count, measureLast, beat]);

  const press = (target: number) => {
    go(target);
    setBeat((b) => b + 1);
  };

  return (
    <div className={held ? "row-slider-held" : undefined}>

      {/* --peek is the sliver of the next tile left showing; the fade is a
          mask so it works over the page's artwork, not only over flat black.
          The left fade only exists once something has slid out that way. */}
      <div
        ref={viewportRef}
        className={`row-slider-viewport @container w-full overflow-hidden [--gap:1rem] [--peek:28px] sm:[--gap:1.5rem] sm:[--peek:40px] [--tile-w:calc((100cqw-1rem-var(--peek))/2)] md:[--tile-w:calc((100cqw-3rem-var(--peek))/3)] lg:[--tile-w:calc((100cqw-4.5rem-var(--peek))/4)] ${
          index > 0
            ? "[mask-image:linear-gradient(to_right,transparent,black_40px,black_calc(100%-72px),transparent)]"
            : "[mask-image:linear-gradient(to_right,black_calc(100%-72px),transparent)]"
        }`}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
      >
        <div
          ref={trackRef}
          className={`row-slider-track flex w-max gap-[var(--gap)] transition-transform ease-in-out ${
            rewinding ? "duration-[1100ms]" : "duration-700"
          }`}
          style={{
            // Clamped to the strip's far end so the last stop is flush with
            // the row's edge instead of leaving the peek's width empty.
            ["--track-w" as string]: `calc(${count} * var(--tile-w) + ${count - 1} * var(--gap))`,
            transform: `translateX(calc(-1 * min(${index} * (var(--tile-w) + var(--gap)), var(--track-w) - 100cqw)))`,
          }}
        >
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
                    // Remounted on every move so the fill starts from zero.
                    <span
                      key={`${index}-${beat}`}
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
