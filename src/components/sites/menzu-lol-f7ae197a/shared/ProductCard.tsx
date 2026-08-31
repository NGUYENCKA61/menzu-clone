"use client";

import Image from "next/image";
import { SiteLink } from "./SiteLink";
import { Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

/** Alt text for the tier icons, which are images and say nothing on their own. */
const TIER_LABELS: Record<TierColor, string> = {
  yellow: "Ultra",
  orange: "Exclusive",
  pink: "Premium",
  cyan: "Deluxe",
  blue: "Select",
};

/**
 * The original menzu strip rhythm — one tile-width slide per beat, sliding
 * home past the end — but woken by the pointer instead of running always:
 * the strip rests until the card is hovered, takes its first step at once,
 * and slides home when the pointer leaves.
 */
const CAROUSEL_STEP_PX = 80; // 72px tile + 8px gap
const CAROUSEL_INTERVAL_MS = 2500;

/**
 * An account listing tile, laid out to the shop's reference: a 16/10 picture
 * with the code and tag floating over it, then "RANK — N SKINS" as the title,
 * two lines of assurance copy, a strip of tier counters, a five-square
 * inventory row, and the price against a "Mua ngay" pill.
 *
 * Chrome, type and colours are the software card's, deliberately — the two
 * sit in the same grids, and a shop whose two product kinds wear different
 * fonts looks assembled from parts.
 *
 * The whole card stays one anchor — an account is bought from its page, so
 * every part of the tile leads there and the pill is a styled span rather than
 * a nested control.
 */
export function ProductCard({ product }: ProductCardProps) {
  const skinChips = product.skinChips ?? [];
  const pct = discountPct(product);

  const trackRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [hovering, setHovering] = useState(false);

  // Runs only while the pointer is on the card: first step at once, the
  // original beat after. The slide home lives in the mouse-leave handler.
  // Readers who asked the OS for less motion keep the resting strip.
  useEffect(() => {
    if (!hovering) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const step = () => {
      const track = trackRef.current;
      const viewport = track?.parentElement;
      if (!track || !viewport) return;

      const maxOffset = Math.max(0, track.scrollWidth - viewport.clientWidth);
      setOffset((prev) =>
        prev + CAROUSEL_STEP_PX > maxOffset ? 0 : prev + CAROUSEL_STEP_PX,
      );
    };

    step();
    const intervalId = setInterval(step, CAROUSEL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [hovering]);

  // The strip's tiles, fixed-size — a stepping strip cannot also be a
  // stretch-to-fit grid.
  const skinTiles = (
    <>
      {skinChips.map((skin) =>
        skin.imageUrl ? (
          <span
            key={skin.name}
            title={skin.name}
            className="relative grid h-12 w-[72px] shrink-0 place-items-center overflow-hidden rounded-[10px] border border-[#24252a] bg-[#0c0d0f]"
          >
            <Image
              src={skin.imageUrl}
              alt={skin.name}
              fill
              sizes="72px"
              className="object-contain p-1"
            />
          </span>
        ) : (
          <span
            key={skin.name}
            title={skin.name}
            className="grid h-12 w-[72px] shrink-0 place-items-center overflow-hidden rounded-[10px] border border-[#24252a] bg-[#0c0d0f] px-1 text-center text-[9px] font-extrabold leading-tight text-[#9b9da5]"
          >
            <span className="line-clamp-2 break-words">{skin.name}</span>
          </span>
        ),
      )}
    </>
  );

  return (
    <SiteLink
      href={product.href}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        setOffset(0);
      }}
      className="group flex h-full w-full flex-col overflow-hidden rounded-[15px] border border-[#24252a] bg-[#101114] transition-all duration-[250ms] hover:-translate-y-1 hover:border-[var(--menzu-accent)]/50 hover:shadow-[0_15px_40px_#00000088]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#17181b]">
        <Image
          src={product.imageUrl ?? productImage(product.code)}
          // A stock code is not a description. Somebody hearing this read out
          // learns what the picture is of — the rank and how many skins are on
          // the account — rather than a string of characters.
          alt={
            product.rank
              ? `Tài khoản ${product.code} — rank ${product.rank}${
                  product.skins > 0 ? `, ${product.skins} skin` : ""
                }`
              : `Tài khoản ${product.code}`
          }
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover object-[85%_center] transition-transform duration-500 group-hover:scale-105"
        />
        {/* A fade along the bottom edge so the picture hands off to the body
            instead of ending on a hard line. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/45 to-transparent"
        />

        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          {/* Same pill as the tag beside it — the two corner badges should
              weigh the same. White text: the code identifies, it does not
              warn or promise. */}
          <span className="inline-flex items-center rounded-full border border-white/10 bg-[#0d0d12]/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur-md">
            #{product.code}
          </span>
          {product.tag !== null && (
            /* Dressed as the software card's status pill — same dark glass,
               same type — minus the coloured dot; the text colour carries the
               meaning: NFA green, FULL THÔNG TIN (and anything else) red. */
            <span
              className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-[#0d0d12]/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide backdrop-blur-md ${
                product.tag.toUpperCase() === "NFA"
                  ? "text-emerald-400"
                  : "text-[#ff6c88]"
              }`}
            >
              {product.tag.toUpperCase() === "NFA" ? (
                <Lock size={11} strokeWidth={2.75} aria-hidden />
              ) : (
                <span aria-hidden>✉</span>
              )}
              {product.tag}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Title with the red marker bar, same as the software card's. */}
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="h-4 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
          <h3 className="truncate text-[17px] font-black uppercase tracking-wide text-white">
            {product.name ||
              [product.rank, product.skins > 0 ? `${product.skins} Skins` : ""]
                .filter(Boolean)
                .join(" — ") ||
              `#${product.code}`}
          </h3>
        </div>

        {/* This account's own words when the shop wrote some; the stock two
            lines otherwise, so no card ever shows a blank where prose goes. */}
        {product.description ? (
          <p className="mb-[14px] mt-2 line-clamp-2 min-h-[37px] text-[12px] leading-[1.55] text-[#9b9da5]">
            {product.description}
          </p>
        ) : (
          <p className="mb-[14px] mt-2 line-clamp-2 min-h-[37px] text-[12px] leading-[1.55] text-[#9b9da5]">
            Tài khoản game nhiều vật phẩm, inventory đẹp và sẵn sàng giao ngay.
            <br />
            Thông tin tài khoản được kiểm tra trước khi bàn giao.
          </p>
        )}

        {/* The labelled stat strip above the weapons: RANK, VIP and VIP
            INGAME always print their labels — an unfilled one simply has
            nothing after the colon. Then any tier counters the account
            carries. Per the reference: the glyphs sit in the accent red,
            labels grey, RANK's value white — the headline stat — and the VIP
            numbers red; the entries spread across the card's full width. The
            skin total is not repeated here — the title already says it. */}
        <div className="mb-3.5 flex w-full items-center justify-between gap-2 overflow-hidden rounded-[9px] border border-[#292a30] bg-[#111216] px-3 py-1.5 uppercase">
          <span className="flex min-w-0 items-center gap-[5px] whitespace-nowrap text-[11px] font-extrabold text-[#c7c8cd]">
            <span aria-hidden className="text-[var(--menzu-accent)]">▲</span> Rank:
            <span className="truncate text-white">{product.rank}</span>
          </span>
          <span aria-hidden className="text-[11px] text-[#3a3b42]">|</span>
          <span className="flex items-center gap-[5px] whitespace-nowrap text-[11px] font-extrabold text-[#c7c8cd]">
            <span aria-hidden className="text-[var(--menzu-accent)]">◆</span> VIP:
            <span className="text-[var(--menzu-accent)]">
              {(product.vip ?? 0) > 0 ? product.vip : ""}
            </span>
          </span>
          <span aria-hidden className="text-[11px] text-[#3a3b42]">|</span>
          <span className="flex items-center gap-[5px] whitespace-nowrap text-[11px] font-extrabold text-[#c7c8cd]">
            <span aria-hidden className="text-[var(--menzu-accent)]">◇</span> VIP Ingame:
            <span className="text-[var(--menzu-accent)]">
              {(product.vipIngame ?? 0) > 0 ? product.vipIngame : ""}
            </span>
          </span>
          {product.tiers.map((tier) => (
            <span
              key={tier.color}
              className="flex items-center gap-[5px] text-[11px] font-extrabold text-[#c7c8cd]"
            >
              <Image
                src={TIER_ICON_PATHS[tier.color]}
                alt={TIER_LABELS[tier.color]}
                width={12}
                height={12}
                className="shrink-0 object-contain"
              />
              <span className="text-[var(--menzu-accent)]">{tier.count}</span>
            </span>
          ))}
        </div>

        {/* The inventory strip, stepping exactly as the original card did:
            one tile left per beat, easing 700ms, sliding home past the end.
            The "+N" chip sits OUTSIDE the scrolling window, pinned at the
            row's end — riding the strip it lived at the far right of the
            track, past where the carousel ever scrolls, and no one saw it.
            Hidden entirely until skins are listed. */}
        {skinChips.length > 0 ? (
          <div className="flex items-center gap-2 border-b border-[#24252a] pb-4">
            <div className="min-w-0 flex-1 overflow-hidden">
              <div
                ref={trackRef}
                className="flex gap-2 transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${offset}px)` }}
              >
                {skinTiles}
              </div>
            </div>
            {product.extraSkins > 0 ? (
              // The original card's counter chip. It shrinks away while the
              // card is hovered — that is when the strip slides, and the row
              // it slides through is the room the chip was standing in.
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-neutral-700/50 bg-neutral-800 text-[11px] font-black text-neutral-300 transition-all duration-300 group-hover:w-0 group-hover:border-transparent group-hover:opacity-0">
                +{product.extraSkins}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto">
          {/* Only when there is a real cut — a struck price above its own
              value, or a "-0%", reads as a trick. */}
          {pct > 0 ? (
            <div className="flex items-center gap-2 pt-[15px]">
              <span className="text-[12px] text-[#686a71] line-through">
                {formatVnd(product.oldPrice)}đ
              </span>
              <span className="rounded-[7px] bg-[var(--menzu-accent)] px-2 py-[5px] text-[11px] font-black text-white">
                -{pct}%
              </span>
            </div>
          ) : null}

          <div className="flex items-end justify-between gap-[15px] pt-1">
            <span className="text-[27px] font-black leading-none tracking-[-0.7px] text-white">
              {formatVnd(product.price)}
              <span className="ml-[3px] text-[12px] font-bold text-[#9b9da5]">đ</span>
            </span>
            {/* The software card's primary button, worn here by the whole-card
                link: the account page is where the purchase happens. */}
            <span className="flex h-[42px] items-center rounded-[9px] bg-[var(--menzu-accent)] px-5 text-[11px] font-extrabold uppercase tracking-wide text-white transition-colors group-hover:bg-[var(--menzu-accent-dark)]">
              Mua ngay
            </span>
          </div>
        </div>
      </div>
    </SiteLink>
  );
}
