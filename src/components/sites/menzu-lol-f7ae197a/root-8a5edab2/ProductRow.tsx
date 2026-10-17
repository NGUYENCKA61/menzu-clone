import { CardImage } from "@/components/sites/menzu-lol-f7ae197a/shared/CardImage";
import { formatVnd } from "@/components/sites/menzu-lol-f7ae197a/shared/productData";
import { sentenceCase, titleCase, withoutNewWord } from "@/lib/displayCase";
import Link from "next/link";
import {
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
  cards: ProductCard[];
  /** Destination of the row's "Xem tất cả" link — the matching index page. */
  viewAllHref: string;
  /**
   * No "Xem tất cả" beside the heading. Hot trending's went unclicked, the
   * shop found; its tiles are the way in.
   */
  hideViewAll?: boolean;
  /**
   * The main site's heading: a short red bar, then the title in capitals
   * (the owner, 17/10/2026: "Hot trending tháng này sửa in hoa thêm dấu |
   * giống web cũ thử", then "Danh sách hack game luôn").
   */
  accentHeading?: boolean;
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
  /** How the picture tiles dress their covers (see TileStyle). */
  tileStyle?: TileStyle;
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
    buttonFace: "bg-panel group-hover:bg-[var(--menzu-accent)]",
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
        "group flex h-full flex-col bg-panel rounded-[15px] overflow-hidden border lift-card hover:-translate-y-1 hover:shadow-[0_15px_40px_#00000088]",
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
              "absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[12px] font-bold text-amber-950 sm:left-2.5 sm:top-2.5 sm:px-2 sm:py-1 sm:text-[12px]",
              quiet && "border border-white/10 bg-scrim/70 text-neutral-100",
            )}
          >
            <Star size={10} className={cn("shrink-0 fill-current", quiet && "text-amber-400")} aria-hidden />
            Top tháng
          </span>
        ) : null}
      </div>

      <h3
        className={cn(
          "text-sm font-black text-white transition-colors",
          wide
            ? "px-3 pt-3 mb-1.5 text-left sm:px-4 sm:pt-3.5 sm:text-[15px]"
            : "text-center mb-2 sm:text-base",
          t.title,
        )}
      >
        {sentenceCase(card.title)}
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
                className="bg-scrim rounded-lg p-1 sm:p-2 xl:p-2.5 flex flex-col xl:flex-row items-center justify-center xl:justify-start gap-1 xl:gap-2.5 border border-white/[0.06] relative overflow-hidden group-hover:border-white/[0.12]"
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
                  <span className="text-[12px] sm:text-[12px] text-gray-500 font-bold mb-0 sm:mb-0.5 whitespace-nowrap">
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
            <span className="relative text-white font-semibold text-[12px] sm:text-[14px] ">
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
      // bento-tile, tile-scrim and tile-caption are hooks for the light trial
      // "moi" (theme-light.css, part 6); they carry no style of their own.
      className={cn(
        "bento-tile keep-dark group relative isolate overflow-hidden rounded-2xl border border-white/[0.07] bg-panel transition-colors hover:border-white/20",
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
        className="tile-scrim absolute inset-0 bg-gradient-to-t from-scrim/95 via-scrim/30 via-50% to-transparent to-75%"
      />
      <span
        className={cn(
          "tile-caption absolute inset-x-3.5 bottom-3 flex flex-col gap-1.5",
          lead && "sm:inset-x-6 sm:bottom-6 sm:gap-2.5",
        )}
      >
        {lead && ranked ? (
          <span className="inline-flex items-center gap-1 self-start rounded-md bg-amber-500/90 px-2 py-1 text-[12px] font-bold text-amber-950">
            <Star size={10} className="shrink-0 fill-current" aria-hidden />
            Top tháng
          </span>
        ) : null}
        <h3
          className={cn(
            "font-black leading-tight text-white",
            lead ? "text-lg sm:text-[28px] sm:leading-[1.08]" : "text-xs sm:text-sm",
          )}
        >
          {sentenceCase(card.title)}
        </h3>
        {lead && card.description ? (
          <p className="hidden max-w-[78%] text-[13px] leading-relaxed text-[#c7c9d1] line-clamp-2 sm:block">
            {card.description}
          </p>
        ) : null}
        {lead ? (
          <span className="mt-1 inline-flex items-center gap-1 self-start rounded-xl bg-[var(--menzu-accent)] px-4 py-2.5 text-[14px] font-semibold text-white transition-colors group-hover:bg-[var(--menzu-accent-dark)]">
            Xem ngay
            <ChevronRight size={12} aria-hidden />
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * How a picture tile dresses its cover (the owner, 13/10/2026: "giữ nguyên
 * kích thước chỉ thêm chữ và giảm độ sáng ảnh", three versions to compare):
 *
 *  - classic: the fade at the foot and the name, as before.
 *  - a: elitehacks' tile — the cover dimmed and faded deeper, the name set
 *    larger with the category's one-line blurb under it.
 *  - b: unnamedtech's tile — the whole cover dimmed evenly, a small eyebrow
 *    naming the platform ("HACK PC") over a quieter name.
 *  - c: lmarket's tile — the cover slightly dimmed above a solid caption bar
 *    holding the name and the blurb, with a platform chip at the end.
 */
export type TileStyle = "classic" | "a" | "b" | "c";

/**
 * The dress the game tiles wear unless a row asks for another. One constant
 * so /categories, which draws the same tiles, follows the home page's game
 * list when the owner picks a dress (the owner, 13/10/2026, UI consistency
 * review).
 */
export const DEFAULT_TILE_STYLE: TileStyle = "classic";

/** The eyebrow a tile wears in style b, from the category's platform tag. */
function platformWord(platform: string | null | undefined): string {
  const p = (platform ?? "").toUpperCase();
  if (p === "PC") return "Hack PC";
  if (p === "MOBILE") return "Hack Mobile";
  if (p === "SPOOFER") return "Spoofer";
  return "Hack game";
}

/**
 * A game as a picture tile, on lmarket's pattern: the cover fills the tile
 * and the name sits over its foot on a dark fade. The whole tile is the link,
 * so the list no longer runs a red bar under every game. 4:3 in the game
 * list; `pick` is the sliding row's wider 16:10 tile, with the month's pill;
 * `big` is a tile a third of the row wide on a desktop rather than a quarter.
 * Exported for /categories, which lists every game in the same tiles.
 */
export function RowTile({
  card,
  pick = false,
  big = false,
  style = DEFAULT_TILE_STYLE,
}: {
  card: ProductCard;
  pick?: boolean;
  big?: boolean;
  style?: TileStyle;
}) {
  // LAB (Launcher): the notched cover, the one memorable element. The
  // picture sits in a frame with a bevelled top-right corner (lab-notch) and
  // the name and the figures sit under it, not over a darkened picture.
  if (style === "classic") {
    const price = card.fromPrice != null ? `từ ${formatVnd(card.fromPrice)}đ` : null;
    const count = card.count != null && card.count > 0 ? `${card.count} sản phẩm` : null;
    // Every word's first letter capital and no "Mới" (the owner, 17/10/2026),
    // here and on /categories, which prints the same tiles.
    const name = titleCase(withoutNewWord(card.title));
    return (
      <Link
        href={card.href}
        className="row-tile group flex flex-col gap-3 rounded-[12px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--menzu-accent)]"
      >
        <span className="lab-notch relative block aspect-[16/10] overflow-hidden border border-white/[0.07] bg-raise transition-colors duration-200 group-hover:border-white/25">
          {card.image ? (
            <CardImage
              src={card.image}
              alt={card.title}
              fill
              sizes={
                big
                  ? "(min-width: 1320px) 440px, (min-width: 768px) 33vw, 50vw"
                  : "(min-width: 1320px) 330px, (min-width: 1024px) 26vw, (min-width: 768px) 34vw, 50vw"
              }
              className="object-cover brightness-[.92] transition-[filter] duration-200 group-hover:brightness-110"
            />
          ) : null}
          {pick ? (
            <span className="tile-pill absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-scrim/80 px-2 py-1 text-[12px] font-semibold text-frost ring-1 ring-inset ring-white/10 backdrop-blur-[6px]">
              <Star size={11} className="shrink-0 fill-current text-notice" aria-hidden />
              Top tháng
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-col gap-1.5">
          <h3
            title={name}
            className={cn(
              "truncate font-display text-[16px] font-semibold leading-snug text-frost transition-colors group-hover:text-white sm:text-[17px]",
              big && "lg:text-[19px]",
            )}
          >
            {name}
          </h3>
          {price || count ? (
            <span className="flex min-w-0 items-center gap-2.5 overflow-hidden whitespace-nowrap text-[13px] leading-none">
              {price ? <span className="lab-figure font-semibold text-frost">{price}</span> : null}
              {price && count ? <span aria-hidden className="h-3 w-px bg-line-strong" /> : null}
              {count ? <span className="truncate text-mist">{count}</span> : null}
            </span>
          ) : card.description ? (
            <span className="truncate text-[13px] text-mist">{sentenceCase(card.description)}</span>
          ) : null}
        </span>
      </Link>
    );
  }
  return (
    <Link
      href={card.href}
      // row-tile, tile-pill, tile-scrim and tile-caption are hooks for the
      // light trial "moi" (theme-light.css, part 6); no style of their own.
      className={cn(
        "row-tile keep-dark group relative isolate block overflow-hidden rounded-[14px] border border-white/[0.06] bg-panel transition-colors hover:border-white/20",
        pick ? "aspect-[16/10]" : "aspect-[4/3]",
        style === "a" && "hover:border-[var(--menzu-accent)]/40",
      )}
    >
      {card.image ? (
        <CardImage
          src={card.image}
          alt={card.title}
          fill
          // The width the picture is DRAWN at, not the tile's. Covers are
          // 16:9 and object-cover crops them by height, so in a 4:3 tile the
          // picture runs 4/3 of the tile's width (a 300px tile draws it 400px
          // wide), and in the 16:10 pick tile about 10/9 of it. Asked for at
          // the tile's own width, a sharp screen got a file smaller than what
          // it painted, and the tiles looked soft (the owner's card picture
          // question, 13/10/2026). Widths follow the grid: 1272px of row at
          // 1320px+, four across from lg, three from md, two below; the pick
          // tiles slide three to a view.
          sizes={
            big
              ? "(min-width: 1320px) 440px, (min-width: 768px) 33vw, 50vw"
              : "(min-width: 1320px) 400px, (min-width: 1024px) 34vw, (min-width: 768px) 45vw, 67vw"
          }
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none",
            style === "a" && "brightness-[.72] saturate-[.9] group-hover:brightness-[.85]",
            style === "b" && "brightness-[.55] group-hover:brightness-[.7]",
            style === "c" && "brightness-[.82] group-hover:brightness-95",
          )}
        />
      ) : null}
      <TileDress card={card} style={style} big={big} />
      {pick ? (
        <span
          className={cn(
            "tile-pill absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-scrim/70 px-2 py-1 text-[12px] font-bold text-white ring-1 ring-inset ring-white/15 backdrop-blur-[6px]",
            big && "lg:left-3.5 lg:top-3.5 lg:text-[11px]",
          )}
        >
          <Star size={10} className="shrink-0 fill-current text-[var(--menzu-accent)]" aria-hidden />
          Top tháng
        </span>
      ) : null}
    </Link>
  );
}

/**
 * "Chỉ từ 39.000đ · 12 sản phẩm", or whichever half the category has; null
 * when it has neither (a service tile), so the blurb can stand in.
 */
function priceLine(card: ProductCard, lead = "Chỉ từ"): string | null {
  const parts: string[] = [];
  if (card.fromPrice != null) parts.push(`${lead} ${formatVnd(card.fromPrice)}đ`);
  if (card.count != null && card.count > 0) parts.push(`${card.count} sản phẩm`);
  return parts.length > 0 ? parts.join(", ") : null;
}

/** The words and shade a tile wears in styles a, b and c (see TileStyle). */
function TileDress({ card, style, big }: { card: ProductCard; style: TileStyle; big: boolean }) {
  const line = priceLine(card);
  if (style === "a") {
    return (
      <>
        <span
          aria-hidden
          className="tile-scrim absolute inset-0 bg-gradient-to-t from-scrim via-scrim/60 via-35% to-scrim/10"
        />
        <span
          aria-hidden
          className="tile-scrim absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--menzu-accent)]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
        <span className={cn("tile-caption absolute inset-x-3.5 bottom-3 flex flex-col gap-1", big && "lg:inset-x-5 lg:bottom-4")}>
          <h3 className={cn("text-[16px] font-black leading-[1.15] text-white sm:text-[17px]", big && "lg:text-[20px]")}>
            {sentenceCase(card.title)}
          </h3>
          {line ? (
            <span className="text-[11px] font-semibold leading-snug text-neutral-200">
              {line}
            </span>
          ) : card.description ? (
            <span className="line-clamp-1 text-[11px] leading-snug text-neutral-300/90">{card.description}</span>
          ) : null}
        </span>
      </>
    );
  }
  if (style === "b") {
    return (
      <>
        <span aria-hidden className="tile-scrim absolute inset-0 bg-scrim/25" />
        <span
          aria-hidden
          className="tile-scrim absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-scrim/90 to-transparent"
        />
        <span className={cn("tile-caption absolute inset-x-3.5 bottom-3 flex flex-col gap-1", big && "lg:inset-x-5 lg:bottom-4")}>
          <span className="text-[12px] font-semibold text-[var(--menzu-accent)]">
            {platformWord(card.platform)}
          </span>
          <h3 className={cn("text-[14px] font-bold leading-tight tracking-wide text-white sm:text-[15px]", big && "lg:text-[18px]")}>
            {sentenceCase(card.title)}
          </h3>
          {line ? (
            <span className="text-[11px] font-medium leading-snug text-neutral-400">
              {priceLine(card, "Từ")}
            </span>
          ) : null}
        </span>
      </>
    );
  }
  return (
    <span className="tile-caption absolute inset-x-0 bottom-0 flex items-center gap-2.5 border-t border-white/[0.07] bg-scrim/92 px-3.5 py-2.5 backdrop-blur-[2px]">
      <span className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-[14px] font-black text-white sm:text-[15px]">{sentenceCase(card.title)}</h3>
        {card.count != null && card.count > 0 ? (
          <span className="truncate text-[10.5px] text-neutral-400">{card.count} sản phẩm</span>
        ) : card.description ? (
          <span className="truncate text-[10.5px] text-neutral-400">{card.description}</span>
        ) : null}
      </span>
      {card.fromPrice != null ? (
        <span className="shrink-0 rounded-md bg-[var(--menzu-accent)]/15 px-2 py-1 text-[10px] font-black tracking-wide text-[var(--menzu-accent)]">
          từ {formatVnd(card.fromPrice)}đ
        </span>
      ) : card.platform ? (
        <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[12px] font-semibold text-neutral-300">
          {card.platform}
        </span>
      ) : null}
    </span>
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
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-400">
                <Star size={10} className="shrink-0 fill-current" aria-hidden />
                Top tháng
              </span>
            ) : null}
            <h3 className="truncate text-[15px] font-black text-white">
              {sentenceCase(card.title)}
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
  hideViewAll = false,
  accentHeading = false,
  tone = "indigo",
  marquee: runs = false,
  ranked = false,
  searchable = false,
  bento: wantsBento = false,
  tiles = false,
  bigPicks = false,
  bigTiles = false,
  tileStyle = DEFAULT_TILE_STYLE,
  list = false,
  quiet = false,
  rows = 1,
  panel = false,
  id,
  className,
}: ProductRowProps) {
  const t = TONES[tone];
  const bento = wantsBento && cards.length >= BENTO_SIZE;
  // Only a row that asked to run does, and only once it has enough tiles to
  // need it: a short row that glided would be motion for its own sake.
  const marquee = runs && cards.length >= MARQUEE_FROM;

  // row-heading and row-view-all are hooks for the light trial "moi"
  // (theme-light.css, part 6); they carry no style of their own.
  // LAB (Launcher): the heading in the display face, sentence case, with no
  // red bar before it; "Xem tất cả" is a plain link (LAB-MASTER section 3).
  const title = accentHeading ? (
    <div className="flex min-w-0 items-center gap-2.5">
      <div aria-hidden className="h-5 w-[3px] shrink-0 rounded-full bg-[var(--menzu-accent)]" />
      <h2 className="row-heading text-xl font-black uppercase tracking-wider text-frost sm:text-2xl">
        {heading}
      </h2>
      {headingSuffix}
    </div>
  ) : (
    <div className="flex min-w-0 items-center gap-3">
      <h2 className="row-heading font-display text-[22px] font-bold leading-tight text-frost sm:text-[28px]">
        {sentenceCase(heading)}
      </h2>
      {headingSuffix}
    </div>
  );
  const viewAll = (
    <Link
      href={viewAllHref}
      className="row-view-all shrink-0 text-[14px] font-medium text-mist underline-offset-4 transition-colors hover:text-frost hover:underline"
    >
      Xem tất cả
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
      <div className={cn("mb-6 flex flex-row items-end justify-between gap-4 sm:mb-7", panel && "mb-5 sm:mb-6")}>
        {title}
        {hideViewAll ? null : viewAll}
      </div>

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
                <RowTile card={card} pick={ranked} big={bigPicks} style={tileStyle} />
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
              <RowTile card={card} big={bigTiles} style={tileStyle} />
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
