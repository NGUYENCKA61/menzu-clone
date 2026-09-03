"use client";

import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { CardBoundary } from "./CardBoundary";
import { SoftwareCard, type SoftwareCardView } from "./SoftwareCard";

/**
 * The "Sản phẩm tương tự" row at the foot of a tool's page: one row of the
 * same tiles the category shelf uses, three across on a desktop, and more
 * of them off to the right than fit — the arrows in the heading and a
 * sideways swipe on a phone bring them in, one tile at a time.
 *
 * The descriptions arrive as plain sentences already: the page strips the
 * rich-editor HTML on the server, so nothing here needs the sanitiser.
 */
export function SimilarSoftwareStrip({ items }: { items: SoftwareCardView[] }) {
  const strip = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // The arrows go dim at either end rather than disappearing, so the row
  // does not jump as the reader reaches the edge.
  const measure = useCallback(() => {
    const el = strip.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  // One tile and its gap per press, read from the layout rather than
  // assumed, so the same button is right at every breakpoint.
  const step = (direction: 1 | -1) => {
    const el = strip.current;
    if (!el) return;
    const tile = el.querySelector<HTMLElement>("[data-tile]");
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const width = tile ? tile.offsetWidth + gap : el.clientWidth;
    el.scrollBy({ left: direction * width, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-white/[0.03] disabled:hover:text-neutral-300";

  return (
    <section
      aria-labelledby="similar-software-heading"
      className="mx-auto w-full max-w-[1320px] px-4 pb-16 lg:px-6"
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2
          id="similar-software-heading"
          className="flex items-center gap-2.5 text-lg font-black uppercase tracking-wider text-white sm:text-xl"
        >
          <Layers size={22} aria-hidden className="shrink-0 text-[var(--menzu-accent)]" />
          Sản phẩm tương tự
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Sản phẩm trước"
            disabled={!canPrev}
            onClick={() => step(-1)}
            className={arrow}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Sản phẩm tiếp theo"
            disabled={!canNext}
            onClick={() => step(1)}
            className={arrow}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Three across on a desktop, two on a tablet, most of the screen on a
          phone: the widths are written out so that a tile and its gap is
          exactly one press of the arrow. The scrollbar is hidden — the
          arrows and the swipe are the controls. */}
      <div
        ref={strip}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:gap-6 xl:gap-8"
      >
        {items.map((s) => (
          <div
            key={s.code}
            data-tile
            className="w-[82vw] max-w-[360px] shrink-0 snap-start sm:w-[calc(50%-0.5rem)] sm:max-w-none lg:w-[calc((100%-3rem)/3)] xl:w-[calc((100%-4rem)/3)]"
          >
            <CardBoundary>
              <SoftwareCard software={s} />
            </CardBoundary>
          </div>
        ))}
      </div>
    </section>
  );
}
