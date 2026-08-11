"use client";

import { useState } from "react";
import Image from "next/image";
import { ZoomIn } from "lucide-react";
import { productImage } from "./productData";

export interface AccountGalleryProps {
  code: string;
  viewers: number;
}

const THUMBNAIL_COUNT = 4;

// Tailwind can't see dynamically-composed class names, so the thumbnail's
// selected and default border states are always emitted as complete literal
// strings.
const THUMBNAIL_TILE_SELECTED =
  "relative w-20 h-14 rounded-xl overflow-hidden border border-indigo-500 transition-colors cursor-pointer shrink-0";
const THUMBNAIL_TILE_DEFAULT =
  "relative w-20 h-14 rounded-xl overflow-hidden border border-neutral-800 hover:border-neutral-600 transition-colors cursor-pointer shrink-0";

/**
 * Product-detail hero gallery: one big preview frame plus a thumbnail strip.
 * The live site only serves a single asset per account, so every thumbnail
 * mirrors the main image — selecting one just swaps which tile is
 * highlighted, there is no second photo to swap the frame to yet.
 */
export function AccountGallery({ code, viewers }: AccountGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const image = productImage(code);

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[16/9] bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 group cursor-pointer">
        <div className="absolute inset-0 w-full h-full group-hover:scale-[1.02] transition-transform duration-500">
          <Image
            src={image}
            alt={code}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="w-full h-full object-contain block transition-opacity duration-500 opacity-100"
          />
        </div>

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 px-6 py-3 rounded-full flex items-center gap-3 text-white font-bold border border-white/10 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            <ZoomIn size={18} />
            Phóng to chi tiết
          </div>
        </div>

        <div className="absolute top-[2px] left-5 z-10 pointer-events-none">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-b-lg bg-black/70 border border-white/10 border-t-0 text-[10px] sm:text-[11px] font-bold text-neutral-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {viewers} người đang xem
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {Array.from({ length: THUMBNAIL_COUNT }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setSelectedIndex(index)}
            aria-label={`Ảnh ${index + 1}`}
            aria-pressed={index === selectedIndex}
            className={
              index === selectedIndex
                ? THUMBNAIL_TILE_SELECTED
                : THUMBNAIL_TILE_DEFAULT
            }
          >
            <Image
              src={image}
              alt={`${code} thumbnail ${index + 1}`}
              fill
              sizes="80px"
              className="object-cover"
            />
          </button>
        ))}
      </div>

      <a
        href="#"
        className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 hover:text-white transition-colors"
      >
        Chính Sách Bảo Hành
      </a>
    </div>
  );
}
