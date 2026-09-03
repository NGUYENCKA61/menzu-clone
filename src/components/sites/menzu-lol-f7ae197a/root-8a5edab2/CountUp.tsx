"use client";

import { useEffect, useRef, useState } from "react";

/** How long a figure takes to arrive, and the curve it arrives on. */
const DURATION_MS = 1500;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A number that counts up from zero to its value the first time it scrolls
 * into view — the strip's four figures, made to be watched.
 *
 * Rendered at its final value by the server, so a crawler and a reader
 * without JavaScript get the real figure; the count starts only once the
 * element is on screen, runs once, and is skipped entirely for a reader who
 * has asked their system for less motion. Formatted the Vietnamese way
 * (21.200, 4,8) with the digits fixed in width so the label under it does
 * not wobble as the figure grows.
 */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let done = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (done || !entries.some((entry) => entry.isIntersecting)) return;
        done = true;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / DURATION_MS);
          setShown(value * easeOut(t));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {shown.toLocaleString("vi-VN", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}
