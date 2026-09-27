import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ChevronRight,
  CircleCheck,
  Layers,
  ShoppingBag,
  Star,
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
  /**
   * The heading in title case ("Hot Trending Tháng Này", whatever case the
   * admin typed it in), larger and bold rather than black, instead of set in
   * capitals — the T1 typography trial.
   */
  plainHeading?: boolean;
  /** One line under the heading saying what the row is. */
  description?: string;
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
  /**
   * One large tile beside four small ones instead of a row of cards — the
   * month's picks on the home page. Needs five tiles; with fewer the row
   * keeps its ordinary layout.
   */
  bento?: boolean;
  /**
   * Picture tiles instead of cards: the cover fills the tile and the name
   * sits over it, with no blurb and no button, on lmarket's pattern. The game
   * list takes 4:3 tiles, four a line; a sliding row (hot trending) takes
   * wider 16:10 ones and keeps its "Top tháng" pill.
   */
  tiles?: boolean;
  /**
   * With `marquee` and `tiles`: the slider shows three picture tiles at a
   * time on a desktop instead of four, each a third of the row (option B3).
   */
  bigPicks?: boolean;
  /**
   * With `tiles` on the game list: three tiles a line from lg instead of
   * four, each a third of the row, so the covers show larger (option B2).
   */
  bigTiles?: boolean;
  /**
   * The picks as rows instead of cards — a small cover, the pill, the name
   * and one line of blurb, two columns from md. Hot trending's, when the
   * owner tries it against the bento.
   */
  list?: boolean;
  /**
   * Cards in a quieter dress: a grey outlined XEM NGAY instead of the red
   * one, a one-line blurb, a paler surface. For the game list under a list
   * of picks, so the page does not run a red bar under every game.
   */
  quiet?: boolean;
  /** Lines of tiles shown before "Xem thêm" (see RowSearch). */
  rows?: number;
  /**
   * Set the row in its own panel — a faint surface, a hairline and a large
   * radius around heading and tiles — so neighbouring rows read as separate
   * blocks rather than one run of cards.
   */
  panel?: boolean;
  /** An anchor on the row, for the hero's "Khám phá ngay" cue to land on. */
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
  wide = false,
  quiet = false,
}: {
  card: ProductCard;
  t: (typeof TONES)[RowTone];
  /** Wear the "TOP THÁNG" pill. */
  top?: boolean;
  /** Drawn a third of the row wide (the game list), not a quarter. */
  wide?: boolean;
  /** Grey outlined button, one-line blurb, paler surface (see ProductRow). */
  quiet?: boolean;
}) {
  const stats = card.stats.filter((s) => !HIDDEN_STATS.has(s.label));

  return (
    <Link
      href={card.href}
      className={cn(
        // The product cards' surface, radius and lift, so a category
        // tile and an account tile in the next row read as one family.
        "group flex h-full flex-col bg-[#101114] rounded-[15px] overflow-hidden border lift-card hover:-translate-y-1 hover:shadow-[0_15px_40px_#00000088]",
        // The game list's wider tile runs its cover to the card's edges, the
        // way lmarket and elitehacks do, and sets its words in a padded block
        // under it; every other row keeps the inset frame.
        wide ? "p-0" : "p-3 sm:p-4",
        t.card,
        quiet && "bg-white/[0.028] border-white/[0.07] hover:border-white/20",
      )}
    >
      {/* 16/9 — the ratio the shop exports its covers at, so a standard
          cover fills the frame edge to edge with nothing cropped and
          nothing letterboxed. */}
      <div
        className={cn(
          "relative w-full aspect-[16/9] overflow-hidden transition-colors",
          wide ? "" : "rounded-[10px] mb-4 border",
          t.frame,
        )}
      >
        {/* Nothing at all rather than an empty src. A category the shop has
            not given a picture arrived here as "", and the browser reads an
            empty src as "this page's own address" — it fetched the whole page
            again, once per pictureless tile, to use as an image. The frame
            keeps its shape either way. */}
        {card.image ? (
          <CardImage
            src={card.image}
            alt={card.title}
            fill
            // A third of a row that stops growing at 1320px is ~372px of
            // picture; asked for as a quarter it came back soft on a sharp
            // screen once the game list went three across.
            sizes={
              wide
                ? "(min-width: 1320px) 400px, (min-width: 768px) 33vw, 40vw"
                : "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 40vw"
            }
            className={cn(
              "transition-transform duration-500 group-hover:scale-110",
              t.image,
            )}
          />
        ) : null}
        {/* The month's-pick pill, in the top-left corner, worn the way
            lmarket.net marks a FEATURED product: a solid amber tag, dark amber
            words, a filled Lucide star in front, square-ish corners. No number: the shop
            wanted the label, not a ranking. */}
        {top ? (
          <span
            className={cn(
              "absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950 sm:left-2.5 sm:top-2.5 sm:px-2 sm:py-1 sm:text-[10px]",
              quiet && "border border-white/10 bg-[#0a0a0d]/70 text-neutral-100",
            )}
          >
            <Star size={10} className={cn("shrink-0 fill-current", quiet && "text-amber-400")} aria-hidden />
            Top tháng
          </span>
        ) : null}
      </div>

      <h3
        className={cn(
          "text-sm font-black uppercase text-white transition-colors tracking-wide",
          wide
            ? "px-3 pt-3 mb-1.5 text-left sm:px-4 sm:pt-3.5 sm:text-[15px]"
            : "text-center mb-2 sm:text-base",
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
        <p
          className={cn(
            "text-[11px] sm:text-xs leading-[1.55] text-[#9b9da5] line-clamp-2",
            wide ? "px-3 mb-3.5 text-left sm:px-4" : "text-center mb-4",
            quiet && "line-clamp-1 text-[#8a8c95]",
          )}
        >
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

      <div className={cn("w-full mt-auto relative", wide && "px-3 pb-3 sm:px-4 sm:pb-4")}>
        <div
          className={cn(
            "relative w-full p-[1.5px] transition-all duration-300 [clip-path:polygon(8px_0,100%_0,100%_calc(100%-8px),calc(100%-8px)_100%,0_100%,0_8px)]",
            t.buttonEdge,
            quiet && "p-0 bg-transparent group-hover:bg-transparent [clip-path:none]",
          )}
        >
          <div
            className={cn(
              "relative w-full overflow-hidden transition-colors duration-300 flex items-center justify-center gap-1.5 py-2.5 sm:py-3 [clip-path:polygon(7px_0,100%_0,100%_calc(100%-7px),calc(100%-7px)_100%,0_100%,0_7px)]",
              t.buttonFace,
              quiet &&
                "sm:py-2.5 rounded-[10px] border border-white/[0.09] bg-white/5 group-hover:bg-white/10 [clip-path:none]",
            )}
          >
            {/* The sweep: a soft white band parked off the left edge that
                crosses to the right while the pointer is on the tile. */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[300%] motion-reduce:hidden",
                quiet && "hidden",
              )}
            />
            <span className="relative text-white font-black text-[10px] sm:text-xs uppercase tracking-widest">
              XEM NGAY
            </span>
            <ChevronRight
              size={12}
              className="relative transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transform-none"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * "DANH SÁCH HACK GAME" or "Hot trending tháng này" → "Danh Sách Hack Game":
 * every word capitalised, the rest lower case, with Vietnamese casing rules.
 * The group names are typed in any case in the admin.
 */
function titleCase(text: string): string {
  return text
    .toLocaleLowerCase("vi")
    .replace(/(^|\s)(\S)/g, (_, space: string, first: string) => space + first.toLocaleUpperCase("vi"));
}

/** Tiles a bento row draws: the lead and the four beside it. */
const BENTO_SIZE = 5;

/**
 * The month's picks as a bento: the first tile large, the next four small
 * beside it. Only the large one carries the "Top tháng" pill, a line of
 * blurb and the red XEM NGAY, so the row has one red button where it had one
 * per card — and it no longer wears the same card as the game list under it,
 * which is what made the two rows run together. Tiles past the fifth wait on
 * the index page, behind the row's "Xem tất cả".
 */
function RowBento({ cards, ranked }: { cards: ProductCard[]; ranked: boolean }) {
  const [lead, ...rest] = cards.slice(0, BENTO_SIZE);
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-3.5 md:h-[360px] md:grid-cols-[2fr_1fr_1fr] md:grid-rows-2 lg:h-[470px]">
      <BentoTile card={lead} lead ranked={ranked} />
      {rest.map((card) => (
        <BentoTile key={card.href} card={card} />
      ))}
    </div>
  );
}

function BentoTile({
  card,
  lead = false,
  ranked = false,
}: {
  card: ProductCard;
  /** The large tile: pill, blurb and button. */
  lead?: boolean;
  ranked?: boolean;
}) {
  return (
    <Link
      href={card.href}
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0d10] transition-colors hover:border-white/20",
        // A phone stacks the lead across both columns over a 2×2 of the rest;
        // from md the grid's own rows give every tile its height.
        lead
          ? "col-span-2 aspect-[16/11] md:col-span-1 md:row-span-2 md:aspect-auto"
          : "aspect-[16/11] md:aspect-auto",
      )}
    >
      {card.image ? (
        <CardImage
          src={card.image}
          alt={card.title}
          fill
          sizes={
            lead
              ? "(min-width: 1320px) 640px, (min-width: 768px) 50vw, 100vw"
              : "(min-width: 1320px) 320px, (min-width: 768px) 25vw, 50vw"
          }
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
        />
      ) : null}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#08080b]/95 via-[#08080b]/30 via-50% to-transparent to-75%"
      />
      <span
        className={cn(
          "absolute inset-x-3.5 bottom-3 flex flex-col gap-1.5",
          lead && "sm:inset-x-6 sm:bottom-6 sm:gap-2.5",
        )}
      >
        {lead && ranked ? (
          <span className="inline-flex items-center gap-1 self-start rounded-md bg-amber-500/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950">
            <Star size={10} className="shrink-0 fill-current" aria-hidden />
            Top tháng
          </span>
        ) : null}
        <h3
          className={cn(
            "font-black uppercase leading-tight text-white",
            lead ? "text-lg sm:text-[28px] sm:leading-[1.08]" : "text-xs sm:text-sm",
          )}
        >
          {card.title}
        </h3>
        {lead && card.description ? (
          <p className="hidden max-w-[78%] text-[13px] leading-relaxed text-[#c7c9d1] line-clamp-2 sm:block">
            {card.description}
          </p>
        ) : null}
        {lead ? (
          <span className="mt-1 inline-flex items-center gap-1 self-start rounded-[10px] bg-[var(--menzu-accent)] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-white transition-colors group-hover:bg-[var(--menzu-accent-dark)]">
            Xem ngay
            <ChevronRight size={12} aria-hidden />
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * A game as a picture tile, on lmarket's pattern: the cover fills the tile
 * and the name sits over its foot on a dark fade. The whole tile is the link,
 * so the list no longer runs a red bar under every game. 4:3 in the game
 * list; `pick` is the sliding row's wider 16:10 tile, with the month's pill;
 * `big` is a tile a third of the row wide on a desktop rather than a quarter.
 */
function RowTile({
  card,
  pick = false,
  big = false,
}: {
  card: ProductCard;
  pick?: boolean;
  big?: boolean;
}) {
  return (
    <Link
      href={card.href}
      className={cn(
        "group relative isolate block overflow-hidden rounded-[14px] border border-white/[0.06] bg-[#0c0d10] transition-colors hover:border-white/20",
        pick ? "aspect-[16/10]" : "aspect-[4/3]",
      )}
    >
      {card.image ? (
        <CardImage
          src={card.image}
          alt={card.title}
          fill
          sizes={
            big
              ? "(min-width: 1320px) 420px, (min-width: 768px) 33vw, 50vw"
              : "(min-width: 1320px) 310px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          }
          className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
        />
      ) : null}
      {pick ? (
        <span
          className={cn(
            "absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-950",
            big && "lg:left-3.5 lg:top-3.5 lg:text-[11px]",
          )}
        >
          <Star size={10} className="shrink-0 fill-current" aria-hidden />
          Top tháng
        </span>
      ) : null}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#08080b]/95 via-[#08080b]/45 via-40% to-transparent to-65%"
      />
      <h3
        className={cn(
          "absolute inset-x-3.5 bottom-3 text-[13px] font-bold leading-tight text-white sm:text-sm",
          big && "lg:inset-x-5 lg:bottom-4 lg:text-base",
        )}
      >
        {card.title}
      </h3>
    </Link>
  );
}

/** Rows a list of picks draws: three lines of two on a desktop. */
const LIST_SIZE = 6;

/**
 * The month's picks as rows: a small cover, the pill, the name and one line
 * of blurb, with a chevron where the red button was. It reads as a short
 * list of picks rather than a second copy of the game grid under it; each
 * row is the link.
 */
function RowList({ cards, ranked }: { cards: ProductCard[]; ranked: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {cards.slice(0, LIST_SIZE).map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="group flex min-w-0 items-center gap-3.5 rounded-[14px] border border-white/[0.07] bg-white/[0.028] p-2.5 transition-colors hover:border-white/20"
        >
          <span className="relative aspect-[16/9] w-[118px] shrink-0 overflow-hidden rounded-[10px] bg-[#111] md:w-[168px]">
            {card.image ? (
              <CardImage
                src={card.image}
                alt={card.title}
                fill
                sizes="(min-width: 768px) 168px, 118px"
                className="object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
              />
            ) : null}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            {ranked ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-amber-400">
                <Star size={10} className="shrink-0 fill-current" aria-hidden />
                Top tháng
              </span>
            ) : null}
            <h3 className="truncate text-sm font-black uppercase tracking-[0.02em] text-white">
              {card.title}
            </h3>
            {card.description ? (
              <p className="truncate text-xs text-[#8a8c95]">{card.description}</p>
            ) : null}
          </span>
          <span
            aria-hidden
            className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-white/5 text-neutral-300 transition-colors group-hover:bg-white/10 group-hover:text-white"
          >
            <ChevronRight size={16} />
          </span>
        </Link>
      ))}
    </div>
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
  bento: wantsBento = false,
  tiles = false,
  bigPicks = false,
  bigTiles = false,
  list = false,
  quiet = false,
  rows = 1,
  panel = false,
  plainHeading = false,
  description,
  id,
  className,
}: ProductRowProps) {
  const t = TONES[tone];
  const bento = wantsBento && cards.length >= BENTO_SIZE;
  // Only a row that asked to run does, and only once it has enough tiles to
  // need it: a short row that glided would be motion for its own sake.
  const marquee = runs && cards.length >= MARQUEE_FROM;

  const title = (
    <div className="flex items-center gap-2.5">
      <div className="w-[3px] h-5 bg-[var(--menzu-accent)] rounded-full shrink-0" />
      <h2
        className={cn(
          "text-white",
          plainHeading
            ? "text-[22px] font-bold leading-tight tracking-[-0.01em] sm:text-[30px]"
            : "text-xl font-black uppercase tracking-wider sm:text-2xl",
        )}
      >
        {plainHeading ? titleCase(heading) : heading}
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
    <section
      id={id}
      className={cn(
        "w-full",
        panel &&
          "rounded-[18px] border border-white/[0.07] bg-white/[0.022] px-3.5 py-4 sm:rounded-3xl sm:px-7 sm:pt-7 sm:pb-6",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-row items-center justify-between mb-8",
          panel && "mb-5 sm:mb-6",
          description && "mb-0 sm:mb-0",
        )}
      >
        {title}
        {viewAll}
      </div>
      {description ? (
        // Indented past the red rung, so it lines up under the heading's words.
        <p className="mt-1.5 mb-5 pl-[13px] text-[13.5px] leading-relaxed text-[#9b9da5] sm:mb-7 sm:text-[15px]">
          {description}
        </p>
      ) : null}

      {bento ? (
        <RowBento cards={cards} ranked={ranked} />
      ) : list ? (
        <RowList cards={cards} ranked={ranked} />
      ) : marquee ? (
        // Each tile takes the width the viewport sets per breakpoint — a
        // quarter, a third, a half of it — with the grid's own gaps, so the
        // sliding row and the still row show tiles of one size.
        <RowSlider count={cards.length} wide={bigPicks}>
          {cards.map((card) => (
            <div key={card.href} className="w-[var(--tile-w)] shrink-0 snap-start">
              {tiles ? (
                <RowTile card={card} pick={ranked} big={bigPicks} />
              ) : (
                <RowCard card={card} t={t} top={ranked} quiet={quiet} />
              )}
            </div>
          ))}
        </RowSlider>
      ) : searchable ? (
        // The tiles are drawn here, on the server, and handed to the search
        // as finished nodes — it only chooses which of them to show.
        <RowSearch
          wide={!tiles || bigTiles}
          rows={rows}
          openOnArrival={id}
          viewAllHref={viewAllHref}
          items={cards.map((card) => ({
            key: card.href,
            title: card.title,
            platform: card.platform ?? null,
            node: tiles ? (
              <RowTile card={card} big={bigTiles} />
            ) : (
              <RowCard card={card} t={t} top={ranked} wide quiet={quiet} />
            ),
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
            node: <RowCard card={card} t={t} top={ranked} quiet={quiet} />,
          }))}
        />
      )}
    </section>
  );
}
