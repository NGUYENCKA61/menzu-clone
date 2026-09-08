import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CircleCheck,
  Layers,
  ShoppingBag,
  Star,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { cn } from "@/lib/utils";
import type { ProductCard } from "./productRowData";
import { RowSearch } from "./RowSearch";
import { RowSlider } from "./RowSlider";

/**
 * Which accent the tiles wear. The service rows keep the indigo the captured
 * site used; the category rows are the shop's own red.
 */
export type RowTone = "indigo" | "menzu";

export interface ProductRowProps {
  heading: string;
  /**
   * Drawn after the heading text, vertically centered with it — a Lucide
   * icon standing in for an emoji the heading would otherwise carry.
   * Decorative: pass it aria-hidden.
   */
  headingSuffix?: React.ReactNode;
  cards: ProductCard[];
  /** Destination of the row's "Xem tất cả" link — the matching index page. */
  viewAllHref: string;
  tone?: RowTone;
  /**
   * Let the row slide once it holds five or more tiles. Off, a
   * long row simply wraps to a second line. The home page turns it on for
   * "Hot trending" alone.
   */
  marquee?: boolean;
  /**
   * A "TOP THÁNG" pill on every tile. For the one row that is the month's
   * pick — hot trending — and nothing else, where the pill would be a claim
   * nobody made.
   */
  ranked?: boolean;
  /**
   * A search field and platform chips over the tiles. For the row that
   * lists every game the shop hacks, where a reader arrives knowing which
   * one they want. Every non-sliding row folds to one line behind "Xem
   * thêm" regardless; this only adds the controls.
   */
  searchable?: boolean;
  /** An anchor on the row, for the hero's "Khám phá sản phẩm" cue to land on. */
  id?: string;
  className?: string;
}

/**
 * Full class strings per tone, never composed — Tailwind reads source text and
 * cannot see a class name that only exists once the template has run.
 */
const TONES: Record<
  RowTone,
  {
    card: string;
    frame: string;
    /** How the cover art meets the frame — cover crops, contain letterboxes. */
    image: string;
    title: string;
    buttonEdge: string;
    buttonFace: string;
  }
> = {
  // Kept for callers that still ask for it; drawn in the same neutrals with
  // an outlined button, now that the site has one accent rather than two.
  indigo: {
    card: "border-white/[0.08] hover:border-[var(--menzu-accent)]/50",
    frame: "border-white/[0.06] group-hover:border-[var(--menzu-accent)]/30",
    image: "object-cover",
    title: "group-hover:text-[var(--menzu-accent)]",
    buttonEdge:
      "bg-[var(--menzu-accent)]/50 group-hover:bg-[var(--menzu-accent)]",
    buttonFace: "bg-[#101114] group-hover:bg-[var(--menzu-accent)]",
  },
  // A neutral ring at rest, the accent only under the pointer — the same
  // chrome the product and software cards wear, so the four kinds of tile on
  // the site read as one set. The always-lit XEM NGAY button is the tile's
  // one red at rest. The image frame stays borderless; the art bleeds to the
  // frame's own rounding.
  menzu: {
    card: "border-white/[0.08] hover:border-[var(--menzu-accent)]/50",
    frame: "border-transparent",
    image: "object-cover",
    title: "group-hover:text-[var(--menzu-accent)]",
    buttonEdge:
      "bg-[var(--menzu-accent)] group-hover:bg-[var(--menzu-accent-dark)]",
    buttonFace:
      "bg-[var(--menzu-accent)] group-hover:bg-[var(--menzu-accent-dark)]",
  },
};

interface StatTone {
  bg: string;
  border: string;
  text: string;
  icon: LucideIcon;
}

// Tailwind can't see dynamically-built class names, so every stat tone needs
// its full class strings spelled out here, keyed by the stat label.
const STAT_TONES: Record<string, StatTone> = {
  "Đã Bán": {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-500",
    icon: ShoppingBag,
  },
  "Đang Bán": {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-500",
    icon: Boxes,
  },
  "Loại SP": {
    bg: "bg-white/[0.04]",
    border: "border-white/[0.08]",
    text: "text-neutral-200",
    icon: Layers,
  },
  "Giá từ": {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-500",
    icon: Tag,
  },
  "Báo giá": {
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-500",
    icon: Tag,
  },
  "Đã xong": {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-500",
    icon: CircleCheck,
  },
};

// Safe fallback so the tone lookup stays total for any unrecognized label.
const DEFAULT_STAT_TONE: StatTone = {
  bg: "bg-white/[0.04]",
  border: "border-white/[0.08]",
  text: "text-neutral-200",
  icon: Layers,
};

function getStatTone(label: string): StatTone {
  return STAT_TONES[label] ?? DEFAULT_STAT_TONE;
}

/**
 * Stats the card no longer prints.
 *
 * A display filter, deliberately, and not a change upstream: `soldCount` and
 * `stockCount` are still queried, still carried in the row data, and still
 * editable on the admin's category screen — they are shop-facing marketing
 * figures somebody may want back. Removing them from `homeRows` instead would
 * have deleted the numbers along with the tiles.
 *
 * The service rows share this component and keep their own stats ("Giá từ",
 * "Đã xong"), which is why this names two labels rather than dropping the
 * block outright.
 */
const HIDDEN_STATS = new Set(["Đã Bán", "Đang Bán"]);

/**
 * How many tiles a row holds before it stops being a grid and starts to run.
 *
 * Four is what the grid shows on a desktop; a fifth tile would open a second
 * line with one tile on it, which reads as an accident. Past that the row
 * becomes a slider — one tile to the left on a beat until the last is in
 * view, then a glide back to the start — holding still while the pointer is
 * on it so a tile can be clicked. See RowSlider.
 */
const MARQUEE_FROM = 5;

/** One tile, drawn the same in the grid and on the slider. */
function RowCard({
  card,
  t,
  top = false,
}: {
  card: ProductCard;
  t: (typeof TONES)[RowTone];
  /** Wear the "TOP THÁNG" pill. */
  top?: boolean;
}) {
  const stats = card.stats.filter((s) => !HIDDEN_STATS.has(s.label));
  // "Từ 35.000đ", or "Miễn phí" for a category whose every tier is free.
  // Nothing at all when the shop has not stocked it — an empty right-hand
  // side reads better than a zero.
  const price =
    card.minPrice === null || card.minPrice === undefined
      ? null
      : card.minPrice === 0
        ? { text: "Miễn phí", from: false }
        : { text: `${formatVnd(card.minPrice)}đ`, from: true };

  return (
    <Link
      href={card.href}
      className={cn(
        // The product cards' surface, radius and lift, so a category
        // tile and an account tile in the next row read as one family.
        "group flex h-full flex-col bg-[#101114] rounded-[15px] overflow-hidden border transition-all duration-[250ms] p-3 sm:p-4 hover:-translate-y-[3px] hover:shadow-[0_12px_30px_#0000008c] active:scale-[0.985] motion-reduce:active:scale-100",
        t.card,
      )}
    >
      {/* 16/9 — the ratio the shop exports its covers at, so a standard
          cover fills the frame edge to edge with nothing cropped and
          nothing letterboxed. */}
      <div
        className={cn(
          "relative w-full aspect-[16/9] rounded-[10px] overflow-hidden mb-3 sm:mb-3.5 border transition-colors",
          t.frame,
        )}
      >
        {/* Nothing at all rather than an empty src. A category the shop has
            not given a picture arrived here as "", and the browser reads an
            empty src as "this page's own address" — it fetched the whole page
            again, once per pictureless tile, to use as an image. The frame
            keeps its shape either way. */}
        {card.image ? (
          <Image
            src={card.image}
            alt={card.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
            className={cn(
              "transition-transform duration-500 group-hover:scale-[1.04]",
              t.image,
            )}
          />
        ) : null}
        {/* The month's-pick pill, in the top-left corner, worn the way
            lmarket.net marks a FEATURED product: a solid amber tag, dark amber
            words, a filled Lucide star in front, square-ish corners. No number: the shop
            wanted the label, not a ranking. */}
        {top ? (
          <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-1.5 py-[3px] text-[9px] font-bold uppercase tracking-wide text-amber-950">
            <Star size={8} className="shrink-0 fill-current" aria-hidden />
            Top tháng
          </span>
        ) : null}

        {/* The price rides the picture on a phone, where the action row has
            no room beside the button — so it costs the tile no height. */}
        {price ? (
          <span className="absolute bottom-1.5 left-1.5 z-10 inline-flex items-baseline gap-1 rounded-md border border-white/10 bg-[#06060b]/85 px-1.5 py-[3px] backdrop-blur-[2px] sm:hidden">
            {price.from ? (
              <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-[#9b9da5]">
                Từ
              </span>
            ) : null}
            <span className="text-[10px] font-black leading-none text-white">{price.text}</span>
          </span>
        ) : null}
      </div>

      <div className="flex items-start gap-2 sm:gap-2.5">
        <span
          aria-hidden
          className="mt-[4px] h-[13px] w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)] sm:h-[14px]"
        />
        <h3
          className={cn(
            "line-clamp-2 min-h-[33px] text-[12.5px] font-extrabold uppercase leading-[1.3] text-white transition-colors sm:min-h-[39px] sm:text-[15px]",
            t.title,
          )}
        >
          {card.title}
        </h3>
      </div>

      {/* Clamped at two lines rather than trusted to be short: the text
          is typed into an admin field, and one long entry would
          otherwise stretch its tile taller than the three beside it and
          pull the whole row's buttons out of line. */}
      <p className="mb-3 mt-1.5 line-clamp-2 min-h-[33px] text-[10.5px] leading-[1.55] text-[#9b9da5] sm:mb-3.5 sm:min-h-[36px] sm:text-[11.5px]">
        {card.description}
      </p>

      {/* Dropped entirely when nothing is left, so a card with no stats
          does not carry the block's bottom margin as a stray gap. */}
      {stats.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3 mb-3 sm:mb-4">
          {stats.map((stat) => {
            const tone = getStatTone(stat.label);
            const StatIcon = tone.icon;

            return (
              <div
                key={stat.label}
                className="bg-[#0a0a0d] rounded-lg p-1 sm:p-2 xl:p-2.5 flex flex-col xl:flex-row items-center justify-center xl:justify-start gap-1 xl:gap-2.5 border border-white/[0.06] relative overflow-hidden group-hover:border-white/[0.12]"
              >
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[var(--menzu-accent)]/50 hidden sm:block" />
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[var(--menzu-accent)]/50 hidden sm:block" />

                <div
                  className={cn(
                    "w-5 h-5 sm:w-7 sm:h-7 xl:w-8 xl:h-8 rounded flex items-center justify-center shrink-0 border",
                    tone.bg,
                    tone.border,
                    tone.text,
                  )}
                >
                  <StatIcon size={12} />
                </div>

                <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
                  <span className="text-[7px] sm:text-[10px] text-gray-500 font-bold uppercase mb-0 sm:mb-0.5 whitespace-nowrap">
                    {stat.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] sm:text-sm font-black leading-none",
                      tone.text,
                    )}
                  >
                    {stat.value}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="mt-auto h-px w-full bg-white/[0.06] transition-colors group-hover:bg-white/10" />

      <div className="mt-2.5 flex items-center justify-between gap-2 sm:mt-3">
        <div
          className={cn(
            "relative w-full p-[1.5px] transition-all duration-300 sm:w-auto [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]",
            t.buttonEdge,
          )}
        >
          <div
            className={cn(
              "relative flex w-full items-center justify-center gap-1.5 overflow-hidden py-2 transition-colors duration-300 sm:px-4 sm:py-2.5 lg:px-5 [clip-path:polygon(7px_0,100%_0,100%_calc(100%-7px),calc(100%-7px)_100%,0_100%,0_7px)]",
              t.buttonFace,
            )}
          >
            {/* The sweep: a soft white band parked off the left edge that
                crosses to the right while the pointer is on the tile. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%] motion-reduce:hidden"
            />
            <span className="relative whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] text-white sm:text-[11px]">
              XEM NGAY
            </span>
            <ArrowRight
              size={12}
              className="relative shrink-0 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"
            />
          </div>
        </div>

        {/* Beside the button from the tablet up; on a phone it rides the
            picture instead, where it costs the tile no height. */}
        {price ? (
          <span className="hidden shrink-0 items-baseline gap-1 whitespace-nowrap sm:inline-flex">
            {price.from ? (
              <span className="hidden text-[9px] font-bold uppercase tracking-[0.14em] text-[#7c7f88] lg:inline">
                Từ
              </span>
            ) : null}
            <span className="text-[12px] font-extrabold leading-none text-white">
              {price.text}
            </span>
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function ProductRow({
  heading,
  headingSuffix,
  cards,
  viewAllHref,
  tone = "indigo",
  marquee: runs = false,
  ranked = false,
  searchable = false,
  id,
  className,
}: ProductRowProps) {
  const t = TONES[tone];
  // Only a row that asked to run does, and only once it has enough tiles to
  // need it: a short row that glided would be motion for its own sake.
  const marquee = runs && cards.length >= MARQUEE_FROM;

  const title = (
    <div className="flex items-center gap-2.5">
      <div className="w-[3px] h-5 bg-[var(--menzu-accent)] rounded-full shrink-0" />
      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
        {heading}
      </h2>
      {headingSuffix}
    </div>
  );
  const viewAll = (
    <Link
      href={viewAllHref}
      className="group flex items-center gap-1 text-[10px] sm:text-xs font-bold text-neutral-400 hover:text-white transition-colors uppercase tracking-widest border-b border-neutral-700 hover:border-[var(--menzu-accent)]"
    >
      <span className="hidden sm:inline">XEM TẤT CẢ</span>
      <span className="sm:hidden">XEM THÊM</span>
      <ArrowRight size={14} />
    </Link>
  );

  return (
    <section id={id} className={cn("w-full", className)}>
      <div className="flex flex-row items-center justify-between mb-8">
        {title}
        {viewAll}
      </div>

      {marquee ? (
        // Each tile takes the width the viewport sets per breakpoint — a
        // quarter, a third, a half of it — with the grid's own gaps, so the
        // sliding row and the still row show tiles of one size.
        <RowSlider count={cards.length}>
          {cards.map((card) => (
            <div key={card.href} className="w-[var(--tile-w)] shrink-0">
              <RowCard card={card} t={t} top={ranked} />
            </div>
          ))}
        </RowSlider>
      ) : searchable ? (
        // The tiles are drawn here, on the server, and handed to the search
        // as finished nodes — it only chooses which of them to show.
        <RowSearch
          openOnArrival={id}
          viewAllHref={viewAllHref}
          items={cards.map((card) => ({
            key: card.href,
            title: card.title,
            platform: card.platform ?? null,
            node: <RowCard card={card} t={t} top={ranked} />,
          }))}
        />
      ) : (
        // Every other row folds the same way the game list does, without
        // the search: one line at rest, the rest behind "Xem thêm", so a
        // group of twelve accounts takes no more of the home page than a
        // group of four until a reader asks.
        <RowSearch
          filters={false}
          openOnArrival={id}
          viewAllHref={viewAllHref}
          items={cards.map((card) => ({
            key: card.href,
            title: card.title,
            platform: card.platform ?? null,
            node: <RowCard card={card} t={t} top={ranked} />,
          }))}
        />
      )}
    </section>
  );
}
