"use client";

import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { productImage } from "./productData";

export interface AccountGalleryProps {
  code: string;
  /** The shop's uploaded picture; absent, the by-code path is shown. */
  imageUrl?: string | null;
  /** Extra screenshots after the main picture; the arrows page through. */
  images?: string[];
  viewers: number;
}

/**
 * Detail gallery for an account, matched to the software page's: one 16/9
 * frame and the warranty bar under it.
 *
 * When the shop has added extra screenshots, arrows appear at the frame's
 * edges and page through them, wrapping at the ends. One picture shows no
 * arrows at all — a control that cannot do anything is worse than none.
 */
export function AccountGallery({
  code,
  imageUrl,
  images = [],
  viewers,
}: AccountGalleryProps) {
  // Main picture first, then the extras; a duplicate path collapses rather
  // than showing the same frame twice on the way around.
  const slides = [...new Set([imageUrl ?? productImage(code), ...images])];
  const [index, setIndex] = useState(0);

  const paged = slides.length > 1;
  const [lightbox, setLightbox] = useState(false);

  function step(delta: number) {
    setIndex((i) => (i + delta + slides.length) % slides.length);
  }

  // While the lightbox is up it owns the keyboard — Escape closes, the arrow
  // keys page — and the body carries a class the fixed header hides behind:
  // even under the backdrop it glows through over the picture. Both bound
  // only then, and both handed back on close.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("lightbox-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("lightbox-open");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  return (
    <div className="space-y-4">
      <div
        title="Bấm để phóng to"
        onClick={() => setLightbox(true)}
        className="relative w-full aspect-[16/9] bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 group cursor-zoom-in"
      >
        {/* All slides sit side by side on one track; paging slides the track
            a full frame, so next glides in from the right and previous from
            the left. The hover zoom stays on the outer wrapper — a scale and
            a slide on the same element would fight over transform. */}
        <div className="absolute inset-0 h-full w-full overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
          <div
            className="flex h-full w-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {slides.map((src, i) => (
              <div key={src} className="relative h-full w-full shrink-0">
                <Image
                  src={src}
                  alt={`${code} — ảnh ${i + 1}`}
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="block h-full w-full object-contain"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-[2px] left-5 z-10 pointer-events-none">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-b-lg bg-black/70 border border-white/10 border-t-0 text-[10px] sm:text-[11px] font-bold text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {viewers} người đang xem
          </div>
        </div>

        {/* Each arrow lives in its own invisible half of the frame and only
            shows itself while the pointer is in that half, sliding in from
            its edge. Touch screens have no pointer to approach with, so
            there the arrows simply stay visible. */}
        {paged ? (
          <>
            <div className="group/nav-l absolute inset-y-0 left-0 z-20 w-1/2">
              <button
                type="button"
                aria-label="Ảnh trước"
                onClick={(e) => {
                  // The frame click behind this opens the lightbox; the arrow
                  // is a different promise.
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-3 top-1/2 grid h-10 w-10 -translate-x-2 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/60 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-black/85 group-hover/nav-l:translate-x-0 group-hover/nav-l:opacity-100 pointer-coarse:translate-x-0 pointer-coarse:opacity-100"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
            <div className="group/nav-r absolute inset-y-0 right-0 z-20 w-1/2">
              <button
                type="button"
                aria-label="Ảnh sau"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-3 top-1/2 grid h-10 w-10 translate-x-2 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/60 text-white opacity-0 backdrop-blur-md transition-all duration-300 hover:bg-black/85 group-hover/nav-r:translate-x-0 group-hover/nav-r:opacity-100 pointer-coarse:translate-x-0 pointer-coarse:opacity-100"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <span className="absolute bottom-3 right-3 z-10 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[10px] font-bold text-neutral-200">
              {(index % slides.length) + 1}/{slides.length}
            </span>
          </>
        ) : null}
      </div>

      {/* The same warranty bar the software gallery carries, verbatim — the
          two detail pages should reassure in one voice. */}
      <a
        href="#"
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 hover:border-emerald-500/70 hover:bg-white/[0.05] transition-colors"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <ShieldCheck size={15} className="shrink-0 text-emerald-400" />
          <span className="truncate text-[12px] font-bold uppercase tracking-widest text-white">
            Chính sách bảo hành
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-neutral-500">
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-200">
            Xem ngay
          </span>
          <ExternalLink size={12} />
        </span>
      </a>

      {/* The lightbox: the picture, near full-screen, over everything. It
          shares the frame's index, so paging in here moves the page's frame
          too and closing lands where the customer left off. */}
      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh tài khoản ${code}`}
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 sm:p-8"
        >
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={18} />
          </button>

          <div
            className="relative h-full max-h-[85vh] w-full max-w-[1280px]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={slides[index]!}
              alt={`${code} — ảnh ${index + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {paged ? (
            <>
              <button
                type="button"
                aria-label="Ảnh trước"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/85 sm:left-6"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                aria-label="Ảnh sau"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/10 bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/85 sm:right-6"
              >
                <ChevronRight size={20} />
              </button>
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[11px] font-bold text-neutral-200">
                {index + 1}/{slides.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
