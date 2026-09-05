import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  CircleCheck,
  Layers,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from "lucide-react";
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

  return (
    <Link
      href={card.href}
      className={cn(
        // The product cards' surface, radius and lift, so a category
        // tile and an account tile in the next row read as one family.
        "group flex h-full flex-col bg-[#101114] rounded-[15px] overflow-hidden border transition-all duration-[250ms] p-3 sm:p-4 hover:-translate-y-1 hover:shadow-[0_15px_40px_#00000088]",
        t.card,
      )}
    >
      {/* 16/9 — the ratio the shop exports its covers at, so a standard
          cover fills the frame edge to edge with nothing cropped and
          nothing letterboxed. */}
      <div
        className={cn(
          "relative w-full aspect-[16/9] rounded-[10px] overflow-hidden mb-4 border transition-colors",
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
              "transition-transform duration-500 group-hover:scale-110",
              t.image,
            )}
          />
        ) : null}
        {/* The month's-pick pill, in the top-left corner the account card
            keeps its code in and dressed the same — dark glass, small caps —
            in the accent red, words only — the shop tried a glyph and took it
            off. No number:
            the shop wanted the label, not a ranking. */}
        {top ? (
          <span className="absolute left-1.5 top-1.5 z-10 inline-flex items-center rounded-full border border-white/10 bg-[#0d0d12]/80 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[var(--menzu-accent)] backdrop-blur-md sm:left-2 sm:top-2 sm:px-2 sm:text-[9px]">
            Top tháng
          </span>
        ) : null}
      </div>

      <h3
        className={cn(
          "text-center text-sm sm:text-base font-black uppercase text-white mb-2 transition-colors tracking-wide",
          t.title,
        )}
      >
        {card.title}
      </h3>

      {/* Clamped at two lines rather than trusted to be short: the text
          is typed into an admin field, and one long entry would
          otherwise stretch its tile taller than the three beside it and
          pull the whole row's buttons out of line. */}
      {card.description ? (
        <p className="text-center text-[11px] sm:text-xs leading-[1.55] text-[#9b9da5] mb-4 line-clamp-2">
          {card.description}
        </p>
      ) : (
        <div className="mb-2" />
      )}

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

      <div className="w-full mt-auto relative">
        <div
          className={cn(
            "relative w-full p-[1.5px] transition-all duration-300 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]",
            t.buttonEdge,
          )}
        >
          <div
            className={cn(
              "relative w-full transition-colors duration-300 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 [clip-path:polygon(7px_0,100%_0,100%_calc(100%-7px),calc(100%-7px)_100%,0_100%,0_7px)]",
              t.buttonFace,
            )}
          >
            <span className="text-white font-black text-[10px] sm:text-xs uppercase tracking-widest">
              XEM NGAY
            </span>
            <ChevronRight size={12} />
          </div>
        </div>
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
