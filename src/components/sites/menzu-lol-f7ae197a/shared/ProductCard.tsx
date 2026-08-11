"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Sparkles, Swords, Trophy } from "lucide-react";
import {
  discountPct,
  formatVnd,
  productImage,
  TIER_ICON_PATHS,
  type Product,
  type TierColor,
} from "./productData";

export interface ProductCardProps {
  product: Product;
}

// Tailwind can't see dynamically-built class names, so every tier color's
// text class is spelled out here as a literal record.
const TIER_TEXT_CLASSES: Record<TierColor, string> = {
  yellow: "text-yellow-400",
  orange: "text-orange-400",
  pink: "text-pink-400",
  cyan: "text-cyan-400",
  blue: "text-blue-400",
};

const TIER_LABELS: Record<TierColor, string> = {
  yellow: "Ultra",
  orange: "Exclusive",
  pink: "Premium",
  cyan: "Deluxe",
  blue: "Select",
};

const MAX_CAROUSEL_TILES = 8;
const CAROUSEL_STEP_PX = 72; // 64px tile + 8px gap
const CAROUSEL_INTERVAL_MS = 2500;

export function ProductCard({ product }: ProductCardProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const track = trackRef.current;
      const viewport = track?.parentElement;
      if (!track || !viewport) return;

      const maxOffset = Math.max(0, track.scrollWidth - viewport.clientWidth);
      setOffset((prev) =>
        prev + CAROUSEL_STEP_PX > maxOffset ? 0 : prev + CAROUSEL_STEP_PX,
      );
    }, CAROUSEL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  const tileCount = Math.max(
    0,
    Math.min(product.skins - product.extraSkins, MAX_CAROUSEL_TILES),
  );

  return (
    <a
      href={`/account/${product.code}`}
      className="h-full w-full group flex flex-col bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden hover:border-neutral-600 transition-colors"
    >
      <div className="relative aspect-[4/3] bg-neutral-950 w-full overflow-hidden">
        <Image
          src={productImage(product.code)}
          alt={product.code}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105 object-[85%_center]"
        />

        <div className="absolute top-4 left-4 flex flex-col items-start gap-2 max-w-[80%] z-20">
          <div className="flex gap-1.5 flex-wrap">
            <span className="bg-white/10 backdrop-blur-md border border-white/15 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap">
              <Trophy size={12} />
              {product.rank}
            </span>
          </div>
        </div>

        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-sm bg-neutral-950/95 text-neutral-300 border border-neutral-700">
            #{product.code}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex w-fit items-stretch bg-neutral-900/60 border border-neutral-700/50 rounded-lg overflow-hidden">
                <div className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 text-white font-black text-[11px] border-r border-neutral-700">
                  <Sparkles size={11} />
                  {product.skins}
                </div>
                <div className="flex items-center gap-2.5 px-2.5 py-1">
                  {product.tiers.map((tier) => (
                    <div
                      key={tier.color}
                      className={`flex items-center gap-1 text-[11px] font-bold ${TIER_TEXT_CLASSES[tier.color]}`}
                    >
                      <Image
                        src={TIER_ICON_PATHS[tier.color]}
                        alt={TIER_LABELS[tier.color]}
                        width={12}
                        height={12}
                        className="object-contain shrink-0"
                      />
                      {tier.count}
                    </div>
                  ))}
                </div>
              </div>

              {product.tag !== null && (
                <span className="px-2 py-1 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-400 text-[10px] font-bold flex items-center gap-1">
                  {product.tag}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 h-12 overflow-hidden relative w-full">
          <div
            ref={trackRef}
            className="flex gap-2 transition-transform duration-700 ease-in-out"
            style={{ transform: `translateX(-${offset}px)` }}
          >
            {Array.from({ length: tileCount }, (_, index) => (
              <div
                key={index}
                className="w-16 h-12 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0 p-1"
              >
                <Swords size={16} className="text-neutral-600" />
              </div>
            ))}
            <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700/50 flex items-center justify-center shrink-0 text-[11px] font-black text-neutral-300">
              +{product.extraSkins}
            </div>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs text-neutral-500 line-through">
              {formatVnd(product.oldPrice)}₫
            </span>
            <span className="text-xl font-black text-white leading-none">
              {formatVnd(product.price)}đ
            </span>
          </div>
          <span className="px-2 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-black">
            -{discountPct(product)}%
          </span>
        </div>
      </div>
    </a>
  );
}
