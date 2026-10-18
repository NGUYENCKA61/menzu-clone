"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { RevealGrid } from "./RevealGrid";

/**
 * The home reviews' title and strip, with a pair of arrows that walk the
 * strip one card at a time (the owner, 18/10/2026: "thêm nút di chuyển coi
 * đánh giá"); a sideways swipe does the same on a phone or a tablet, while
 * a desktop moves only by the arrows.
 *
 * The arrows are the "Sản phẩm tương tự" strip's (SimilarSoftwareStrip):
 * small rings in the heading, dim at either end rather than gone, so
 * nothing jumps as the reader reaches the edge. They sit in the block's top
 * right corner and never over a card: the game rows' slider once had
 * arrows over its first and last tiles and the shop had them taken off
 * (30/09/2026). From lg they ride the centred title's line; narrower, the
 * title leaves no room beside it, so they take their own line at the
 * right, just over the cards.
 *
 * The strip is RevealGrid's own box, this wrapper's one child, so the cards
 * keep their rise-in and their glow.
 */
export function ReviewsRail({ header, children }: { header: ReactNode; children: ReactNode }) {
  const rail = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const strip = useCallback(() => {
    const el = rail.current?.firstElementChild;
    return el instanceof HTMLElement ? el : null;
  }, []);

  const measure = useCallback(() => {
    const el = strip();
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [strip]);

  // No first measure by hand: a ResizeObserver reports once as soon as it
  // starts watching, and that report sets the arrows.
  useEffect(() => {
    const el = strip();
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [strip, measure]);

  // One card and its gap per press, read from the layout, so the same press
  // is right at every breakpoint.
  const step = (direction: 1 | -1) => {
    const el = strip();
    if (!el) return;
    const card = el.firstElementChild;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const width = card instanceof HTMLElement ? card.offsetWidth + gap : el.clientWidth;
    el.scrollBy({
      left: direction * width,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-neutral-300 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-white/[0.03] disabled:hover:text-neutral-300";

  return (
    <>
      <div className="relative">
        {header}
        {/* From lg a box as tall as the title's line (32px), the arrows
            centred in it, so they sit level with the title. */}
        <div className="mt-6 flex items-center justify-end gap-2 lg:absolute lg:right-0 lg:top-0 lg:mt-0 lg:h-8">
          <button
            type="button"
            aria-label="Đánh giá trước"
            disabled={!canPrev}
            onClick={() => step(-1)}
            className={arrow}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Đánh giá tiếp theo"
            disabled={!canNext}
            onClick={() => step(1)}
            className={arrow}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* A scroll box at every width now, four cards to a view from lg (the
          card sets its own width). pt-2 keeps the hover lift and its glow
          clear of the box's top edge, which would cut them; the margins
          above are 8px short to match. overscroll-x-contain: a swipe past
          the end must not reach the system, which reads it as "back".
          From lg the box takes no scrolling by hand, only the arrows move
          it (the owner, 18/10/2026: "giữ cái nút kia chỉ bỏ thanh kéo
          thôi"); a touchpad or a sideways wheel no longer drags it.
          overflow hidden still lets scrollBy move it. A phone and a tablet
          keep the swipe ("trên đt cứ giữ thanh kéo đó"). */}
      <div ref={rail} className="mt-1 lg:mt-6">
        <RevealGrid className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pt-2 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-x-hidden">
          {children}
        </RevealGrid>
      </div>
    </>
  );
}
