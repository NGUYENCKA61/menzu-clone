"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  X,
  ZoomIn,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { lockScroll, unlockScroll } from "./modalChrome";
import { useOverlayPresence } from "./useOverlayPresence";

/**
 * The detail pages' picture frame: one 16/9 box that pages through every
 * picture a product has, and opens any of them near full-screen.
 *
 * One gallery for both kinds of product. The account page had this; the
 * tool page had a single frame that showed images[0], dropped the rest in
 * silence, and drew a "Phóng to chi tiết" prompt on hover with nothing
 * behind it - a movement promising a thing that did not exist.
 *
 * When there is more than one picture, arrows appear at the frame's edges
 * and page through them, wrapping at the ends. One picture shows no arrows
 * at all - a control that cannot do anything is worse than none. The
 * lightbox shares the frame's index, so paging in there moves the frame
 * too and closing lands where the reader left off.
 */
export function PictureGallery({
  slides,
  alt,
  badge,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  empty = "Chưa có ảnh",
}: {
  /** In order; a repeated path shows once. */
  slides: string[];
  /** What the pictures are of - the product's name or code. */
  alt: string;
  /** Drawn over the frame's top-left corner: the "N người đang xem" pill. */
  badge?: ReactNode;
  sizes?: string;
  /** What the empty frame says when a product has no pictures yet. */
  empty?: string;
}) {
  const pictures = [...new Set(slides)];
  const [index, setIndex] = useState(0);
  const paged = pictures.length > 1;
  const [lightbox, setLightbox] = useState(false);
  const { mounted, leaving } = useOverlayPresence(lightbox);

  function step(delta: number) {
    setIndex((i) => (i + delta + pictures.length) % pictures.length);
  }

  // While the lightbox is up it owns the keyboard — Escape closes, the arrow
  // keys page — and the body carries a class the fixed header hides behind:
  // even under the backdrop it glows through over the picture. Both bound
  // only then, and both handed back the moment the exit starts.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("lightbox-open");
    lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("lightbox-open");
      unlockScroll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  // A product with no pictures yet still renders a frame, because an empty
  // column would read as a broken page rather than as a missing picture.
  if (pictures.length === 0) {
    return (
      <div className="relative w-full aspect-[16/9] rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900">
        <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold uppercase tracking-widest text-neutral-700">
          {empty}
        </div>
        {badge}
      </div>
    );
  }

  return (
    <>
      <div
        title="Bấm để phóng to"
        onClick={() => setLightbox(true)}
        className="relative w-full aspect-[16/9] bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 group cursor-zoom-in"
      >
        {/* All slides sit side by side on one track; paging slides the track
            a full frame, so next glides in from the right and previous from
            the left. The hover zoom stays on the outer wrapper — a scale and
            a slide on the same element would fight over transform. */}
        <div className="absolute inset-0 h-full w-full overflow-hidden group-hover:scale-[1.02] transition-transform duration-500 motion-reduce:transition-none">
          <div
            className="flex h-full w-full transition-transform duration-500 ease-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {pictures.map((src, i) => (
              <div key={src} className="relative h-full w-full shrink-0">
                <Image
                  src={src}
                  alt={`${alt} — ảnh ${i + 1}`}
                  fill
                  sizes={sizes}
                  className="block h-full w-full object-contain"
                  priority={i === 0}
                />
              </div>
            ))}
          </div>
        </div>

        {badge}

        {/* The prompt only where there is a pointer to hover with; a touch
            screen has no hover, and the frame itself already opens on a
            tap. It sits under the arrows, which have their own promise. */}
        <div className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-fine:flex motion-reduce:transition-none">
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-6 py-3 font-bold text-white translate-y-4 transition-transform duration-300 group-hover:translate-y-0 motion-reduce:transition-none">
            <ZoomIn size={18} />
            Phóng to chi tiết
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
              {(index % pictures.length) + 1}/{pictures.length}
            </span>
          </>
        ) : null}
      </div>

      {/* The lightbox: the picture, near full-screen, over everything. */}
      {mounted ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh ${alt}`}
          onClick={() => setLightbox(false)}
          inert={leaving}
          className={`order-modal-backdrop fixed inset-0 z-[300] flex items-center justify-center bg-black/90 p-4 sm:p-8${
            leaving ? " order-modal-backdrop-out" : ""
          }`}
        >
          <button
            type="button"
            aria-label="Đóng"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X size={18} />
          </button>

          {/* The rise is on a wrapper rather than on the picture's own box:
              that box is the containing block for the filled <Image>, and
              a transform on it would move the picture's frame of reference
              mid-animation. */}
          <div
            className={`order-modal-card flex h-full max-h-[85vh] w-full max-w-[1280px]${
              leaving ? " order-modal-card-out" : ""
            }`}
          >
            <div className="relative h-full w-full" onClick={(e) => e.stopPropagation()}>
              <Image
                src={pictures[index]!}
                alt={`${alt} — ảnh ${index + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
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
                {index + 1}/{pictures.length}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/**
 * The warranty bar under both galleries — the two detail pages should
 * reassure in one voice. It leads to the warranty shelf of the wiki; it
 * was an <a href="#"> on both pages, a full-width bar with an
 * "external link" icon that went nowhere.
 */
export function WarrantyBar() {
  return (
    <Link
      href="/docs#WARRANTY"
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 hover:border-emerald-500/70 hover:bg-white/[0.05] transition-colors"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {/* The same emerald the "Còn hàng" line and the detection pill use,
            so the reassurances on the page read as one voice. */}
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
    </Link>
  );
}
