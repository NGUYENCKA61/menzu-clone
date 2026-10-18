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
  /** The game list's tile shape from sm up (see ListShape). */
  listShape?: ListShape;
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
  titled = false,
}: {
  card: ProductCard;
  t: (typeof TONES)[RowTone];
  /** Wear the "TOP THÁNG" pill. */
  top?: boolean;
  /** Drawn a third of the row wide (the game list), not a quarter. */
  wide?: boolean;
  /** Grey outlined button, one-line blurb, paler surface (see ProductRow). */
  quiet?: boolean;
  /**
   * The game tiles' wording (tile style "d"): every word's first letter
   * capital, no "Mới", the blurb in sentence case.
   */
  titled?: boolean;
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
        {titled ? titleCase(withoutNewWord(card.title)) : sentenceCase(card.title)}
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
          {titled ? sentenceCase(card.description) : card.description}
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
 *    larger with the category's one-line blurb under it. The owner calls
 *    this one A1 (17/10/2026).
 *  - a2: A1's words over elitehacks' own shade (the owner, 17/10/2026: "làm
 *    thử giống elite hack vậy", "elite là A2"): the picture keeps its full
 *    brightness, a black fade rises from the foot and a vignette darkens
 *    the left and the bottom, leaving the top right clear (.lab-elite-shade).
 *  - a3: A2's shade resting at the strength A2 shows under the pointer, 70%,
 *    and a step lighter again when hovered, 55% (the owner, 17/10/2026: "bỏ
 *    luôn cả bản a3 thay bằng a3 mới là bản card có độ sáng bằng độ sáng khi
 *    rê chuột hiện tại đi"). Like the first A3 it has no red rim under the
 *    pointer ("làm thử bản không có hiệu ứng đỏ viền thử"), only the name
 *    turns red. Kept apart from A2 ("không lưu vô A2 liền nha").
 *  - a4: A3's words and hover at lmarket's brightness (the owner, 17/10/2026:
 *    "làm cái a4 đi bố cục giữ nguyên chỉ khác độ sáng"): the top of the
 *    picture left alone, dark only at the foot where the words sit
 *    (.lab-lmarket-shade).
 *  - a5: A4 with its foot shade cut to the words (the owner, 18/10/2026:
 *    "làm cái a5 là a4 nhưng mà phủ tối chân vừa tới tiêu đề"): the dark
 *    sits behind the caption and fades out just above the title, however
 *    many lines the title takes. A4's dark corner at the top left, its
 *    words and its hover stay, and a thin even layer keeps the picture
 *    above the foot about as dark as A4's on average ("độ sáng phần còn
 *    lại á a5 có giống a4 chưa", "uk làm đi") (.lab-a5-shade, .lab-a5-foot).
 *  - a5cu: the first A5, lmarket's best-seller card, their numbers 2 to 4
 *    ("a5 thì bố cục giống lmarket nhưng vẫn là có hàng 4 card"), in our
 *    rows of four: A4's shade, a bold name, a quiet second line, then "từ"
 *    and the price in bold white, as their "from €24.99".
 *  - a6: A4 with its price line as quiet as B4's, the same "Chỉ từ ...đ, N
 *    sản phẩm" in a grey, lighter type (the owner, 18/10/2026: "làm cái a6
 *    là a4 nhưng mà chữ chỉ từ sản phẩm giảm độ sáng như b4").
 *  - a8: A6 with its grey line sized to the site's: only the price on a
 *    phone, where the whole line ran past 3 of 9 half-width tiles, and the
 *    whole line at 13px from sm, the size of the other cards' grey lines
 *    (the owner, 18/10/2026: "thử đi không ổn tui kêu lùi", then "cho bản
 *    này là a8 đi").
 *  - a9: A8 with its corners rounded 8px where every tile has 14px (the
 *    owner, 18/10/2026: "làm cái a9 bớt bo cong lại thử").
 *  - a10: A8 (its 14px corners) with the price picked out: "Từ" for "Chỉ
 *    từ", the price in white bold figures, the count grey from sm (the
 *    owner, 18/10/2026: "làm cái a10 highlight bỏ cái từ chỉ ghi từ từ
 *    highlight giá tiền").
 *  - a6cu2: the A6 before that, A3's words, layout and hover (17/10: "kiểu
 *    như a luôn đi bố cục á", "giống a3") with A4's shape, bright above and
 *    dark below, at about A3's strength: .lab-lmarket-shade at 70% ("làm a6
 *    là kiểu sáng trên tối dưới giống a4 nhưng độ sáng cỡ tầm a3"). Tried
 *    before as A3's shade with A4's foot over it, then as the first A6's
 *    black lower 40%.
 *  - a6cu: the first A6, lmarket's game card from lmarket.net/cheats/ ("a5
 *    giống này đi https://lmarket.net/cheats/ bản 4 card"): square in the
 *    game list, the picture clear but for a black foot over its lower 40%,
 *    a shadowed name and a small line; the card rises and its rim lights
 *    under the pointer while the others fade (lab-lm-* in globals.css).
 *  - a7: A5 with A6's quiet price line, the foot ending above the title and
 *    the "Chỉ từ ...đ, N sản phẩm" line in B4's grey (the owner, 18/10/2026:
 *    "a7 là kiểu a5 nhưng chữ mô tả hạ sáng giống a6 đi").
 *  - a7cu, b7: the A6 before (a6cu2)'s brightness, bright above and dark
 *    below at about A3's strength, under the first A5's words and under
 *    B4's (no platform line) (the owner, 18/10/2026: "a7 là bản a6 sáng
 *    trên tối dưới như a5 hoặc b5 đi"). "a7cu" is the first A7.
 *  - b: unnamedtech's tile — the whole cover dimmed evenly, a small eyebrow
 *    naming the platform ("HACK PC") over a quieter name.
 *  - b2, b3: B's words at A2's and A3's brightness (the owner, 17/10/2026:
 *    "cho độ sáng như A2 đi thành B2, độ sáng như A3 thành B3"): the picture
 *    undimmed under elitehacks' shade at 90% or 70%, thinning when hovered.
 *    The red rim and name of A2/A3 are not part of their brightness, so B's
 *    own quiet hover stays.
 *  - b1, b4, b6: the rest of the set ("b cũng làm 6 phiên bản độ sáng giống
 *    a đi"): B's words at A1's brightness (the picture dimmed, an even fade),
 *    A4's (lmarket's foot shade) and the first A6's (lmarket's black lower
 *    40%). The first B, darker than all of them, stays as "b" ("B gốc"). B4
 *    drops the platform line ("b4 bỏ cái dòng hack game đó đi").
 *  - b5: B4's words at the new A5's shade, the foot ending above the title
 *    over a thin even layer (the owner, 18/10/2026, comparing "a4 a5 b4
 *    b5"). While A5 had A4's brightness, ?kieu=b5 opened B4.
 *  - c: lmarket's tile — the cover slightly dimmed above a solid caption bar
 *    holding the name and the blurb, with a platform chip at the end.
 *  - c1: bubblehacks' catalogue card (the owner, 17/10/2026: "làm bản C1
 *    https://bubblehacks.com/catalog"): the 16:9 cover on top with its foot
 *    darkened, the name in heavy type under it and a row of chips, the price
 *    chip pale red with dark words; lifts 3px under the pointer.
 *  - d: the old card with the quiet grey button, option A of 26/09/2026
 *    (the owner, 17/10/2026: "kiểu D là nút xám nhẹ: giữ bố cục cũ, nút XEM
 *    NGAY thành nút xám viền mảnh, mô tả còn 1 dòng, nhãn Top tháng dịu
 *    lại", "kiểu D vẫn có 4 cục 4 card nha"): RowCard quiet, four to a row
 *    in both rows (the home page drops the big picks for it).
 */
export type TileStyle =
  | "classic"
  | "a" | "a2" | "a3" | "a4" | "a5" | "a5cu" | "a6" | "a6cu" | "a6cu2"
  | "a7" | "a7cu" | "a8" | "a9" | "a10"
  | "b" | "b1" | "b2" | "b3" | "b4" | "b5" | "b6" | "b7"
  | "c" | "c1" | "d";

/**
 * The dress the game tiles wear unless a row asks for another. One constant
 * so /categories, which draws the same tiles, follows the home page's game
 * list when the owner picks a dress (the owner, 13/10/2026, UI consistency
 * review).
 *
 * LAB: elitehacks' tile (the owner, 17/10/2026, picking from the home card
 * page: "sửa lab 2 kiểu A: kiểu elitehacks"), settled as "a2" with their own
 * shade and hover ("chốt a2 vậy đi"), and back on it after trying "a3" (A2
 * lighter at rest, without the red rim): "lùi lại về a2". Then "b",
 * unnamedtech's tile ("giờ qua B B: kiểu unnamedtech"), with "b2" and "b3"
 * at A2's and A3's brightness, then "c", lmarket's tile ("giờ qua kiểu C:
 * kiểu lmarket"), back on "a2" ("quay lại kiểu a2"), A1 once more ("a1
 * thử"), "a3", "a4" (A3 at lmarket's brightness), "a5", lmarket's
 * best-seller card ("a5 thử"), "a6", their /cheats/ card, "c1",
 * bubblehacks' catalogue card, "d", the old quiet-button card, "a" (A1)
 * again ("a1 đi"), "a2" ("a2 đi"), "a3" ("a3 đi"), "b", the first B
 * ("quay về card b1"), the new "a6" (A4's shape at A3's strength, now
 * "a6cu2"), "a7" (A5's words at A6's brightness, now "a7cu"; "b7" is
 * B4's), "a2" again (18/10,
 * choosing: "a2 thử"), "a3" ("a3 thử"), "a4" after comparing A4, A5, B4
 * and B5 at 4:3 and 16:9 (18/10: "chốt a4 thôi"), "a6", A4 with the quiet
 * price line (18/10: "chốt a6"), now "a8", A6 with that line sized to the
 * site's, the version on show when the owner named it ("cho bản này là a8
 * đi"). "a" is A1, "classic" the framed picture with the name under it.
 */
export const DEFAULT_TILE_STYLE: TileStyle = "a8";

/**
 * LAB: the game list's tile shape from sm up, "43" or "169", so both can be
 * opened side by side (?khung=43 / ?khung=169; the owner, 18/10/2026: "bổ
 * sung thêm 1 phiên bản card lùi card tiến … để tui so sánh luôn"). A phone
 * keeps 4:3 either way. The choice itself is parked on the review page.
 */
export type ListShape = "43" | "169";
export const DEFAULT_LIST_SHAPE: ListShape = "169";

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
  shape = DEFAULT_LIST_SHAPE,
}: {
  card: ProductCard;
  pick?: boolean;
  big?: boolean;
  style?: TileStyle;
  /** A list tile's shape from sm up (see ListShape); pick tiles ignore it. */
  shape?: ListShape;
}) {
  // LAB: tile style "d" is the old card with the quiet grey button (see
  // TileStyle); the game list's tile runs its cover to the edges ("wide"),
  // the sliding row keeps the inset frame it had.
  if (style === "d") {
    return <RowCard card={card} t={TONES.menzu} top={pick} wide={!pick} quiet titled />;
  }
  // LAB: bubblehacks' catalogue card (see TileStyle "c1"): the 16:9 cover on
  // top, uncropped, then the name and a row of chips on the card itself.
  if (style === "c1") {
    const name = titleCase(withoutNewWord(card.title));
    const count = card.count != null && card.count > 0 ? `${card.count} sản phẩm` : null;
    return (
      <Link
        href={card.href}
        className="row-tile lab-bubble-card group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-panel focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--menzu-accent)]"
      >
        <span className="relative block aspect-video overflow-hidden bg-raise">
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
              className="object-cover"
            />
          ) : null}
          <span aria-hidden className="lab-bubble-shade absolute inset-0" />
          {pick ? (
            <span className="tile-pill absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-scrim/70 px-2 py-1 text-[12px] font-bold text-white ring-1 ring-inset ring-white/15 backdrop-blur-[6px]">
              <Star size={10} className="shrink-0 fill-current text-[var(--menzu-accent)]" aria-hidden />
              Top tháng
            </span>
          ) : null}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-2.5 p-3 sm:gap-3 sm:p-4">
          <h3 title={name} className="lab-bubble-title line-clamp-2 text-white sm:truncate">
            {name}
          </h3>
          {card.fromPrice != null || count ? (
            <span className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {card.fromPrice != null ? (
                <span className="lab-bubble-price rounded-lg px-2 py-1 text-[12px] font-semibold sm:px-2.5 sm:text-[13px]">
                  từ <span className="lab-figure">{formatVnd(card.fromPrice)}đ</span>
                </span>
              ) : null}
              {count ? (
                <span className="rounded-lg border border-line bg-raise px-2 py-1 text-[12px] font-medium text-mist sm:px-2.5 sm:text-[13px]">
                  {count}
                </span>
              ) : null}
            </span>
          ) : card.description ? (
            <span className="truncate text-[13px] text-mist">{sentenceCase(card.description)}</span>
          ) : null}
        </span>
      </Link>
    );
  }
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
        // The pick tile stands 4:3 on a phone like the list's: at 16:10 its
        // name and price climbed under the "Top tháng" pill.
        // The first A6 is lmarket's square card in the game list.
        // The list's tiles show the whole 16:9 cover from sm up, where 4:3
        // cut an eighth off each side (the owner, 18/10/2026: "mấy cái ảnh
        // trong card hình như bị zoom lên", "làm thử tui coi"); a phone keeps
        // 4:3, where 16:9 left the words no room.
        pick
          ? "aspect-[4/3] sm:aspect-[16/10]"
          : style === "a6cu"
            ? "aspect-square"
            : shape === "43"
              ? "aspect-[4/3]"
              : "aspect-[4/3] sm:aspect-video",
        style === "a" && "hover:border-[var(--menzu-accent)]/40",
        // A2 lights its rim in the shop's red under the pointer, as
        // elitehacks lights theirs in their green.
        style === "a2" && "hover:border-[var(--menzu-accent)]",
        style === "a6cu" && "lab-lm-card rounded-xl border-white/10 hover:border-white/10",
        // A9 is A8 with tighter corners.
        style === "a9" && "rounded-[8px]",
      )}
    >
      {/* A6's ring of light sits behind the picture and shows at the rim. */}
      {style === "a6cu" ? <span aria-hidden className="lab-lm-glow" /> : null}
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
          // A6's square tile draws the 16:9 cover 16/9 of its width.
          sizes={
            big
              ? "(min-width: 1320px) 440px, (min-width: 768px) 33vw, 50vw"
              : style === "a6cu" && !pick
                ? "(min-width: 1320px) 520px, (min-width: 1024px) 45vw, (min-width: 768px) 60vw, 90vw"
                : "(min-width: 1320px) 400px, (min-width: 1024px) 34vw, (min-width: 768px) 45vw, 67vw"
          }
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none",
            style === "a6cu" && "duration-700 ease-out group-hover:scale-[1.04]",
            style === "a" && "brightness-[.72] saturate-[.9] group-hover:brightness-[.85]",
            style === "b" && "brightness-[.55] group-hover:brightness-[.7]",
            style === "b1" && "brightness-[.72] saturate-[.9] group-hover:brightness-[.85]",
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

/** The words and shade a tile wears in styles a to a6, b to b3 and c (see TileStyle). */
function TileDress({ card, style, big }: { card: ProductCard; style: TileStyle; big: boolean }) {
  const line = priceLine(card);
  if (style === "a6cu") {
    // lmarket's second line is the count ("18 cheats"); the shop asked for
    // the price on its cards (13/10/2026), so it leads the line here.
    const second =
      priceLine(card, "Từ") ??
      (card.description ? sentenceCase(card.description) : null);
    return (
      <>
        <span aria-hidden className="tile-scrim lab-lm-foot" />
        <span aria-hidden className="lab-lm-ring" />
        <span className="tile-caption absolute inset-x-0 bottom-0 p-3">
          <h3
            className={cn(
              "lab-lm-title line-clamp-2 text-[14px] font-bold leading-snug text-white sm:line-clamp-1 sm:text-[16px]",
              big && "lg:text-[18px]",
            )}
          >
            {titleCase(withoutNewWord(card.title))}
          </h3>
          {second ? <span className="mt-0.5 block truncate text-[11px] text-white/70">{second}</span> : null}
        </span>
      </>
    );
  }
  if (style === "a5cu" || style === "a7cu") {
    const second =
      card.count != null && card.count > 0
        ? `${card.count} sản phẩm`
        : card.description
          ? sentenceCase(card.description)
          : null;
    return (
      <>
        {/* The first A7 is the first A5 at the A6-before's lighter strength
            (the owner, 18/10/2026). */}
        <span aria-hidden className={cn("tile-scrim lab-lmarket-shade absolute inset-0", style === "a7cu" && "lab-lmarket-shade-light")} />
        <span className={cn("tile-caption absolute inset-x-2.5 bottom-2.5 flex flex-col sm:inset-x-4 sm:bottom-3.5", big && "lg:inset-x-5 lg:bottom-4")}>
          <h3
            className={cn(
              "line-clamp-2 text-[14px] font-bold leading-tight text-white transition-colors duration-300 group-hover:text-[var(--menzu-accent)] sm:text-[17px]",
              big && "lg:text-[20px]",
            )}
          >
            {titleCase(withoutNewWord(card.title))}
          </h3>
          {/* Not on a phone: three lines climbed under the "Top tháng" pill
              of the half-width Hot trending tile (seen 18/10/2026). */}
          {second ? <span className="mt-0.5 hidden truncate text-[13px] text-neutral-400 sm:block">{second}</span> : null}
          {card.fromPrice != null ? (
            <span className="mt-1.5 text-[12px] text-neutral-400 sm:mt-2 sm:text-[13px]">
              từ <span className="lab-figure text-[14px] font-bold text-white sm:text-[16px]">{formatVnd(card.fromPrice)}đ</span>
            </span>
          ) : null}
        </span>
      </>
    );
  }
  if (style === "a" || style === "a2" || style === "a3" || style === "a4" || style === "a5" || style === "a6" || style === "a6cu2" || style === "a7" || style === "a8" || style === "a9" || style === "a10") {
    // A5 and A7 carry the foot that ends above the title.
    const titleFoot = style === "a5" || style === "a7";
    return (
      <>
        <span
          aria-hidden
          className={cn(
            "tile-scrim absolute inset-0",
            style === "a"
              ? "bg-gradient-to-t from-scrim via-scrim/60 via-35% to-scrim/10"
              : style === "a4" || style === "a6" || style === "a8" || style === "a9" || style === "a10"
                ? "lab-lmarket-shade"
                : titleFoot
                  ? // A4's corner and a thin even layer here; A5's foot
                    // rides on the caption below, so it ends where the
                    // title does.
                    "lab-a5-shade"
                  : style === "a6cu2"
                    ? // A4's shape, bright above and dark below, at about A3's
                      // strength (the owner, 17/10/2026: "làm a6 là kiểu sáng
                      // trên tối dưới giống a4 nhưng độ sáng cỡ tầm a3").
                      "lab-lmarket-shade lab-lmarket-shade-light"
                    : cn("lab-elite-shade", style === "a3" && "lab-elite-shade-light"),
          )}
        />
        <span
          aria-hidden
          className={cn(
            "tile-scrim absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--menzu-accent)]/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            // Above A5's foot, which is drawn after it.
            titleFoot && "z-[1]",
          )}
        />
        {/* On a phone the tile is half the screen wide: a smaller name kept to
            two lines and the price on one line, so the words stay on the
            picture's lower half. */}
        <span
          className={cn(
            "tile-caption absolute flex flex-col gap-0.5 sm:gap-1",
            titleFoot
              ? // The caption carries A5's foot: full width from the bottom,
                // the words at A4's insets, the dark fading out just above
                // the title (.lab-a5-foot).
                cn("lab-a5-foot inset-x-0 bottom-0 px-2.5 pb-2.5 sm:px-3.5 sm:pb-3", big && "lg:px-5 lg:pb-4")
              : cn("inset-x-2.5 bottom-2.5 sm:inset-x-3.5 sm:bottom-3", big && "lg:inset-x-5 lg:bottom-4"),
          )}
        >
          <h3
            className={cn(
              "line-clamp-2 text-[14px] font-black leading-[1.15] text-white sm:text-[17px]",
              big && "lg:text-[20px]",
              (style === "a2" || style === "a3" || style === "a4" || style === "a5" || style === "a6" || style === "a6cu2" || style === "a7" || style === "a8" || style === "a9" || style === "a10") && "transition-colors duration-300 group-hover:text-[var(--menzu-accent)]",
            )}
          >
            {titleCase(withoutNewWord(card.title))}
          </h3>
          {line && (style === "a8" || style === "a9") ? (
            // A8 sizes A6's line to the site's: on a phone, where the whole
            // line ran past the half-width tile, only the price; from sm the
            // whole line at 13px, the size of the other cards' grey lines
            // (the owner, 18/10/2026: "thử đi không ổn tui kêu lùi").
            <>
              <span className="truncate text-[11px] font-medium leading-snug text-neutral-400 sm:hidden">
                {card.fromPrice != null ? `Chỉ từ ${formatVnd(card.fromPrice)}đ` : line}
              </span>
              <span className="hidden truncate text-[13px] font-medium leading-snug text-neutral-400 sm:block">
                {line}
              </span>
            </>
          ) : line && style === "a10" && card.fromPrice != null ? (
            // A10: "Từ" where A8 says "Chỉ từ", the price in white bold
            // figures as the site's product cards print theirs, the count
            // in grey from sm (the owner, 18/10/2026: "làm cái a10 highlight
            // bỏ cái từ chỉ ghi từ từ highlight giá tiền").
            <span className="truncate text-[11px] font-medium leading-snug text-neutral-400 sm:text-[13px]">
              Từ <span className="lab-figure font-bold text-white">{formatVnd(card.fromPrice)}đ</span>
              {card.count != null && card.count > 0 ? (
                <span className="hidden sm:inline">, {card.count} sản phẩm</span>
              ) : null}
            </span>
          ) : line && style === "a10" ? (
            // No price, only a count: A8's grey line.
            <span className="truncate text-[11px] font-medium leading-snug text-neutral-400 sm:text-[13px]">{line}</span>
          ) : line ? (
            <span
              className={cn(
                "truncate text-[11px] leading-snug",
                // A6 (A4) and A7 (A5) keep A's words but grey the price
                // line as B4 does.
                style === "a6" || style === "a7" ? "font-medium text-neutral-400" : "font-semibold text-neutral-200",
              )}
            >
              {line}
            </span>
          ) : card.description ? (
            <span className="line-clamp-1 text-[11px] leading-snug text-neutral-300/90">{sentenceCase(card.description)}</span>
          ) : null}
        </span>
      </>
    );
  }
  if (style === "b" || style === "b1" || style === "b2" || style === "b3" || style === "b4" || style === "b5" || style === "b6" || style === "b7") {
    return (
      <>
        {style === "b" ? (
          <>
            <span aria-hidden className="tile-scrim absolute inset-0 bg-scrim/25" />
            <span
              aria-hidden
              className="tile-scrim absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-scrim/90 to-transparent"
            />
          </>
        ) : style === "b1" ? (
          // A1's even fade over A1's dimmed picture (see RowTile).
          <span aria-hidden className="tile-scrim absolute inset-0 bg-gradient-to-t from-scrim via-scrim/60 via-35% to-scrim/10" />
        ) : style === "b7" ? (
          // B7 is B4 (B5 when B5 was B4) at A6's lighter strength (the
          // owner, 18/10/2026).
          <span aria-hidden className="tile-scrim absolute inset-0 lab-lmarket-shade lab-lmarket-shade-light" />
        ) : style === "b4" ? (
          <span aria-hidden className="tile-scrim absolute inset-0 lab-lmarket-shade" />
        ) : style === "b5" ? (
          // A5's corner and even layer; its foot rides on the caption below.
          <span aria-hidden className="tile-scrim absolute inset-0 lab-a5-shade" />
        ) : style === "b6" ? (
          <span aria-hidden className="tile-scrim lab-lm-foot" />
        ) : (
          <span
            aria-hidden
            className={cn("tile-scrim absolute inset-0 lab-elite-shade", style === "b3" && "lab-elite-shade-light")}
          />
        )}
        {/* Same phone care as A: a tighter inset, the name kept to two lines
            and the price to one, so the words stay clear of the pill. */}
        <span
          className={cn(
            "tile-caption absolute flex flex-col gap-0.5 sm:gap-1",
            // B5 carries A5's foot on its caption, as A5 does.
            style === "b5"
              ? cn("lab-a5-foot inset-x-0 bottom-0 px-2.5 pb-2.5 sm:px-3.5 sm:pb-3", big && "lg:px-5 lg:pb-4")
              : cn("inset-x-2.5 bottom-2.5 sm:inset-x-3.5 sm:bottom-3", big && "lg:inset-x-5 lg:bottom-4"),
          )}
        >
          {/* B4 drops the platform line: with no platform tagged it read
              "Hack game" on every tile (the owner, 17/10/2026: "b4 bỏ cái dòng
              hack game đó đi"). */}
          {style === "b4" || style === "b5" || style === "b7" ? null : (
            <span className="text-[12px] font-semibold text-[var(--menzu-accent)]">
              {platformWord(card.platform)}
            </span>
          )}
          <h3 className={cn("line-clamp-2 text-[14px] font-bold leading-tight tracking-wide text-white sm:text-[15px]", big && "lg:text-[18px]")}>
            {titleCase(withoutNewWord(card.title))}
          </h3>
          {line ? (
            <span className="truncate text-[11px] font-medium leading-snug text-neutral-400">
              {priceLine(card, "Từ")}
            </span>
          ) : null}
        </span>
      </>
    );
  }
  // On a phone the tile is half the screen wide and the price chip left the
  // name a few letters, so there the price moves into the second line.
  const countOrBlurb =
    card.count != null && card.count > 0
      ? `${card.count} sản phẩm`
      : card.description
        ? sentenceCase(card.description)
        : null;
  const phoneLine = priceLine(card, "Từ") ?? countOrBlurb;
  return (
    <span className="tile-caption absolute inset-x-0 bottom-0 flex items-center gap-2.5 border-t border-white/[0.07] bg-scrim/92 px-2.5 py-2 backdrop-blur-[2px] sm:px-3.5 sm:py-2.5">
      <span className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-[14px] font-black text-white sm:text-[15px]">{titleCase(withoutNewWord(card.title))}</h3>
        {phoneLine ? <span className="truncate text-[10.5px] text-neutral-400 sm:hidden">{phoneLine}</span> : null}
        {countOrBlurb ? (
          <span className="hidden truncate text-[10.5px] text-neutral-400 sm:block">{countOrBlurb}</span>
        ) : null}
      </span>
      {card.fromPrice != null ? (
        <span className="hidden shrink-0 rounded-md bg-[var(--menzu-accent)]/15 px-2 py-1 text-[10px] font-black tracking-wide text-[var(--menzu-accent)] sm:inline-block">
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
  listShape = DEFAULT_LIST_SHAPE,
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
              <RowTile card={card} big={bigTiles} style={tileStyle} shape={listShape} />
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
