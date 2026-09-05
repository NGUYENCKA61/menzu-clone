import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
 * What a tone still decides now that every tile is the cover itself: how the
 * art meets the box. Both cover it edge to edge today; the record stays so a
 * row that needs its logos letterboxed can ask for `object-contain` without
 * touching the tile.
 */
const TONES: Record<RowTone, { image: string }> = {
  indigo: { image: "object-cover" },
  menzu: { image: "object-cover" },
};

/**
 * Stats the tile never prints as figures.
 *
 * A display filter, deliberately, and not a change upstream: `soldCount` and
 * `stockCount` are still queried, still carried in the row data, and still
 * editable on the admin's category screen; the tile's "N sản phẩm" line is
 * counted from the catalogue instead (ProductCard.count).
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

/**
 * The line under the name. A service tile prints its own figures ("Giá từ
 * 50.000đ · Đã xong 120"); a category prints the line the admin wrote for
 * it — the one the old tile carried, which is where the home page's
 * keywords live ("HACK DELTA FORCE an toàn, giá rẻ, Aimbot…"); the first
 * version of this tile dropped it and the page lost a dozen of them. A
 * tile with neither shows its platform, or the name alone. The product
 * count is a mark on the cover instead, see RowCard.
 */
function describe(card: ProductCard): string | null {
  const figures = card.stats.filter((stat) => !HIDDEN_STATS.has(stat.label));
  if (figures.length > 0) {
    return figures.map((stat) => `${stat.label} ${stat.value}`).join(" · ");
  }
  return card.description?.trim() || card.platform || null;
}

/**
 * One tile, drawn the same in the grid and on the slider — the way
 * lmarket.net draws a game on its cheats page: the cover fills the box, the
 * name and one line of detail sit on it over a dark gradient at the foot,
 * and there is nothing else to read. Under the pointer the tile lifts and
 * grows a little, an accent ring and a hairline light along its top edge,
 * the cover eases in, and the rest of the row dims to let it stand out (the
 * grid wears `group/grid` for that; the slider's tiles simply lift).
 *
 * 4:3 rather than the original's square: the shop exports its covers at
 * 16:9, and a square would cut almost half of each one away.
 */
function RowCard({
  card,
  t,
  top = false,
}: {
  card: ProductCard;
  t: (typeof TONES)[RowTone];
  /** Wear the "TOP THÁNG" mark. */
  top?: boolean;
}) {
  const detail = describe(card);

  return (
    <Link
      href={card.href}
      className="group/card relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/10 bg-[#101114] will-change-transform transition-all duration-500 ease-out hover:z-20 hover:-translate-y-1.5 hover:scale-[1.02] hover:border-[var(--menzu-accent)]/40 hover:shadow-[0_18px_36px_-14px_color-mix(in_oklab,var(--menzu-accent)_55%,transparent)] group-hover/grid:opacity-70 hover:opacity-100!"
    >
      {/* Nothing at all rather than an empty src. A category the shop has
          not given a picture arrived here as "", and the browser reads an
          empty src as "this page's own address" — it fetched the whole page
          again, once per pictureless tile, to use as an image. The box keeps
          its shape and its dark either way. */}
      {card.image ? (
        <Image
          src={card.image}
          alt={card.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
          className={cn(
            "transition-transform duration-700 ease-out group-hover/card:scale-[1.04]",
            t.image,
          )}
        />
      ) : null}

      {/* The foot fades to black so the words read on any cover. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/95 via-black/40 to-transparent"
      />

      {/* Lit under the pointer: an inset ring in the accent and a hairline
          along the top edge, the original's two-part glow. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
      >
        <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-[var(--menzu-accent)]/60" />
        <div className="absolute -top-px left-3 right-3 h-px bg-gradient-to-r from-transparent via-[var(--menzu-accent)] to-transparent" />
      </div>

      {/* The month's-pick mark, where the original pins "★ FEATURED", in
          the chrome the shop settled on for it — dark glass, red small caps,
          words only — so the page keeps its one accent (an amber tag was
          tried here and read as a second one). */}
      {top ? (
        <span className="absolute left-2.5 top-2.5 z-10 inline-flex items-center rounded-full border border-white/10 bg-[#0d0d12]/80 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[var(--menzu-accent)] backdrop-blur-md">
          Top tháng
        </span>
      ) : null}

      {/* How many products the category lists, the way lmarket's game tiles
          say "18 cheats" — counted from the catalogue, never the admin-typed
          stock figure — as a mark on the cover's other corner, in the same
          glass as the month's-pick pill so the two read as a pair. */}
      {card.count && card.count > 0 ? (
        <span className="absolute right-2.5 top-2.5 z-10 inline-flex items-center rounded-full border border-white/10 bg-[#0d0d12]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/75 backdrop-blur-md">
          {card.count} sản phẩm
        </span>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="line-clamp-1 text-[13px] font-black uppercase tracking-wide text-white drop-shadow-[0_2px_8px_rgb(0_0_0/0.9)] sm:text-[15px]">
          {card.title}
        </h3>
        {/* One line, as typed: a category's line is a sentence of keywords
            and reads as one, not as a tracked label. */}
        {detail ? (
          <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-white/65 drop-shadow-[0_1px_4px_rgb(0_0_0/0.8)] sm:text-[11px]">
            {detail}
          </p>
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
  // The same pill the grid's "Xem thêm" wears below, so the row's two
  // controls read as one kind of thing rather than a link above a button.
  const viewAll = (
    <Link href={viewAllHref} className="group inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/[0.03] px-4 text-[10px] font-black uppercase tracking-widest text-neutral-200 transition-colors hover:border-[var(--menzu-accent)]/50 hover:bg-[var(--menzu-accent)]/10 hover:text-[var(--menzu-accent)] sm:text-[11px]">
      <span className="hidden sm:inline">XEM TẤT CẢ</span>
      <span className="sm:hidden">XEM THÊM</span>
      <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
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
