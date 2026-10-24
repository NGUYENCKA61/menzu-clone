"use client";

import Image from "next/image";
import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";
import { SiteLink } from "./SiteLink";
import { ChevronRight, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sentenceCase } from "@/lib/displayCase";
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
  /** The page's LCP image (first in its grid, nothing drawn above it):
   *  preloaded and fetched at High. One per page, since each is a
   *  <link rel=preload>. */
  priority?: boolean;
  /** Also above the fold: fetched before the rest, at no raised priority. */
  eager?: boolean;
  /** LAB: ?ban=cu, the card from before 19/10/2026. */
  old?: boolean;
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
// A beat of 1.5s and a 500ms ease, on trial (24/10/2026, "hiệu ứng chạy
// nhanh hơn xíu được không"); the original's 2.5s and 700ms before.
const CAROUSEL_INTERVAL_MS = 1500;

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
 *
 * Like the software card since 19/10/2026 ("đồng bộ với trang chủ card"): the
 * home tile's 14px corners, faint rim, shade and name on the picture, and the
 * pill at 42px with 10px corners. `old` is the lab's ?ban=cu.
 */
export function ProductCard({ product, priority = false, eager = false, old = false }: ProductCardProps) {
  const skinChips = product.skinChips ?? [];
  const pct = discountPct(product);
  const title =
    (product.name ? sentenceCase(product.name) : "") ||
    [product.rank, product.skins > 0 ? `${product.skins} Skins` : ""].filter(Boolean).join(" - ") ||
    `#${product.code}`;

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
      {skinChips.map((skin, index) =>
        skin.imageUrl ? (
          <span
            key={`${skin.name}-${index}`}
            title={skin.name}
            className="relative grid h-12 w-[72px] shrink-0 place-items-center overflow-hidden rounded-[10px] border border-[#24252a] bg-[#0c0d0f]"
          >
            <Image
              src={skin.imageUrl}
              alt={skin.name}
              fill
              sizes="144px"
              className="object-contain p-1"
            />
          </span>
        ) : (
          <span
            key={`${skin.name}-${index}`}
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
      // acc-card is a hook for the light trial "moi" (theme-light.css,
      // part 6); it carries no style of its own. On hover it lifts with a red
      // edge and a shadow, as the tool card does (3100's effect, 24/10/2026),
      // and at rest its edge is white 10% like the tool card's.
      className={`acc-card group flex h-full w-full flex-col overflow-hidden transition-colors ${
        old
          ? "lab-notch border border-line bg-white/[0.02] hover:border-line-strong"
          : "rounded-[14px] border border-white/10 bg-panel lift-card hover:-translate-y-1 hover:border-[var(--menzu-accent)]/50 hover:shadow-[0_15px_40px_#00000088]"
      }`}
    >
      <div className={`relative w-full overflow-hidden bg-raise ${old ? "aspect-[16/10] lab-notch-top" : "aspect-[16/9] rounded-t-[14px]"}`}>
        <CardImage
          src={product.imageUrl ?? productImage(product.code)}
          // A stock code is not a description. Somebody hearing this read out
          // learns what the picture is of — the rank and how many skins are on
          // the account — rather than a string of characters.
          alt={
            product.rank
              ? `Tài khoản ${product.code}, rank ${product.rank}${
                  product.skins > 0 ? `, ${product.skins} skin` : ""
                }`
              : `Tài khoản ${product.code}`
          }
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          // The page's LCP card is preloaded and fetched at High (Next 16's
          // `priority` only preloads), the other cards above the fold are
          // fetched eagerly, the rest wait their turn. Never both on one
          // picture: preload already implies eager.
          {...(priority
            ? { preload: true, fetchPriority: "high" as const }
            : eager
              ? { loading: "eager" as const }
              : {})}
          className={`object-cover object-[85%_center] transition-transform duration-500 ${old ? "group-hover:scale-105" : "group-hover:scale-[1.025]"}`}
        />
        {old ? (
          // A fade along the bottom edge so the picture hands off to the body
          // instead of ending on a hard line.
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/45 to-transparent"
          />
        ) : (
          // The picture stands clean as the tool card's does, only its red
          // hover line kept; the name moved under it (24/10/2026, "card acc
          // làm cho đồng bộ đi").
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--menzu-accent)]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}

        <div className="absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          {/* Same pill as the tag beside it — the two corner badges should
              weigh the same. White text: the code identifies, it does not
              warn or promise. */}
          {/* 8px corners like every chip on the site since 19/10/2026 (the
              round pills in the old look), the dark glass kept for the photo
              under them. */}
          <span className={`inline-flex items-center border border-white/10 bg-[#0d0d12]/88 px-2.5 py-1 text-[12px] font-semibold text-white ${old ? "rounded-full" : "rounded-md"}`}>
            #{product.code}
          </span>
          {/* The stock count ("Còn N acc") came off the picture (the owner,
              19/10/2026: "bỏ cái nhãn Còn … acc"); the old look keeps it. */}
          {old && product.stock !== undefined && product.stock !== null ? (
            <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[12px] font-semibold text-sky-400">
              Còn {product.stock} acc
            </span>
          ) : null}
          {product.tag !== null && (
            /* Dressed as the software card's status pill — same dark glass,
               same type — minus the coloured dot; the text colour carries the
               meaning: NFA green, FULL THÔNG TIN (and anything else) red. */
            <span
              className={`inline-flex items-center gap-1 border border-white/10 bg-[#0d0d12]/88 px-2.5 py-1 text-[12px] font-semibold ${
                old ? "rounded-full" : "rounded-md"
              } ${
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
        {/* The name under the picture in both looks; the new one wears the
            software card's red marker bar and two held lines. */}
        {old ? (
          <div className="flex items-center gap-2.5">
            <h3 className="truncate text-[17px] font-semibold text-frost">{title}</h3>
          </div>
        ) : (
          // The tool card's name block: the red bar by the first line, 16px
          // at 800, two lines held.
          <div className="flex items-start gap-2.5">
            <span aria-hidden className="mt-1 h-4 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
            <h3
              title={title}
              className="line-clamp-2 min-h-[2.75em] min-w-0 break-words text-[16px] font-extrabold leading-snug text-white transition-colors duration-300 group-hover:text-[var(--menzu-accent)]"
            >
              {title}
            </h3>
          </div>
        )}

        {/* This account's own words when the shop wrote some; the stock two
            lines otherwise, so no card ever shows a blank where prose goes.
            13px like the tool card's blurb on the same page (24/10/2026). */}
        {product.description ? (
          <p className="mb-[14px] mt-2 line-clamp-2 min-h-[37px] text-justify text-[13px] leading-[1.55] text-mist">
            {product.description}
          </p>
        ) : (
          <p className="mb-[14px] mt-2 line-clamp-2 min-h-[37px] text-justify text-[13px] leading-[1.55] text-mist">
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
        <div className="mb-3.5 flex w-full items-center justify-between gap-2 overflow-hidden rounded-[9px] border border-[#292a30] bg-[#111216] px-3 py-1.5 ">
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
            one tile left per beat, easing 500ms, sliding home past the end.
            The "+N" chip sits OUTSIDE the scrolling window, pinned at the
            row's end — riding the strip it lived at the far right of the
            track, past where the carousel ever scrolls, and no one saw it.
            Hidden entirely until skins are listed. */}
        {skinChips.length > 0 ? (
          <div className="flex items-center gap-2 border-b border-[#24252a] pb-4">
            <div className="min-w-0 flex-1 overflow-hidden">
              <div
                ref={trackRef}
                className="flex gap-2 transition-transform duration-500 ease-in-out"
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
              <span className="rounded-[7px] bg-[var(--menzu-accent-dark)] px-2 py-[5px] text-[11px] font-black text-white">
                -{pct}%
              </span>
            </div>
          ) : null}

          <div className="flex items-end justify-between gap-[15px] pt-1">
            <span className="text-2xl font-black leading-none tracking-[-0.7px] text-white">
              {formatVnd(product.price)}
              <span className="ml-[3px] text-[12px] font-bold text-[#9b9da5]">đ</span>
            </span>
            {/* The software card's primary button, worn here by the whole-card
                link: the account page is where the purchase happens. Worded
                12px like its "Thuê ngay" (24/10/2026), but white with black
                words ("nút mua ngay chuyển sang màu trắng chữ đen"), turning
                the accent red, words white, while the card is hovered ("rê
                vào là màu đỏ"). */}
            <span
              className={`flex items-center gap-1 bg-white pl-5 pr-4 text-[12px] font-semibold text-black transition-colors group-hover:bg-[var(--menzu-accent)] group-hover:text-white ${
                old ? "h-11 rounded-xl" : "h-[42px] rounded-[10px]"
              }`}
            >
              Mua ngay
              <ChevronRight
                size={14}
                strokeWidth={2.5}
                aria-hidden
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>
          </div>
        </div>
      </div>
    </SiteLink>
  );
}
