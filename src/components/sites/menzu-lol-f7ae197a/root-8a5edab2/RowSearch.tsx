"use client";

import Link from "next/link";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

import { BorderBeam } from "./BorderBeam";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import {
  CATEGORY_PLATFORMS,
  platformLabel,
  type CategoryPlatform,
} from "@/lib/categoryPlatform";
import { columnsOf, hiddenAfter, revealLimit } from "@/lib/rowReveal";

/** One tile the row can show, with the words it can be found by. */
export interface RowSearchItem {
  key: string;
  title: string;
  /** "PC" / "MOBILE" / "SPOOFER", or null for a category nobody has tagged. */
  platform: string | null;
  /** The tile itself, rendered by the server and handed down whole. */
  node: ReactNode;
}

/** Plain letters for matching: case and Vietnamese marks folded away, so
 *  "valorant" finds "HACK VALORANT" and "dong" finds "Đồng". */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** The chip row's first entry: no platform filter at all. */
const ALL = "ALL";

const CHIP =
  "h-8 rounded-lg border px-3 text-[10px] font-black uppercase tracking-widest transition-colors";
const CHIP_IDLE =
  "border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/25 hover:text-white";
const CHIP_ACTIVE =
  "border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]";

/** The reveal: each opened tile rises in this many ms after the one before. */
const IN_STAGGER_MS = 40;
/** The fold: how long one tile takes to leave, and the gap between tiles. */
const OUT_MS = 260;
const OUT_STAGGER_MS = 25;

/**
 * A row of tiles with a search field over it and a row of platform chips
 * under that: typing narrows the grid to the games whose name contains the
 * words, a chip narrows it to one kind — PC, mobile, spoofer — and the two
 * stack. Past the first line the rest waits behind "Xem thêm", which opens
 * all of it at once.
 *
 * The tiles arrive already rendered — they are the same server-drawn cards
 * every row uses — so this component only decides which of them to show.
 * Matching folds case and diacritics, because a game is typed "valorant"
 * far more often than "VALORANT", and a Vietnamese name should be found
 * with or without its marks.
 *
 * The chips are the fixed list from categoryPlatform.ts, not the platforms
 * present: a chip that leads to "nothing here yet" tells the shop what to
 * tag, where a chip that only appears once something is tagged would leave
 * the row looking like it never had the filter at all.
 *
 * "One line" is measured, not assumed: the grid is two, three or four
 * columns wide depending on the screen, and the column count is read off
 * the rendered grid so a line is a line at every width. Changing the search
 * or the chip folds the row back to one line — a new question gets a fresh
 * first look.
 */
export function RowSearch({
  items,
  viewAllHref,
  placeholder = "Tìm game…",
}: {
  items: RowSearchItem[];
  /** Where the empty state sends a reader who found nothing. */
  viewAllHref: string;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<CategoryPlatform | typeof ALL>(ALL);
  const [expanded, setExpanded] = useState(false);
  /** True while "Thu gọn" is playing the tiles out, before they go. */
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const [columns, setColumns] = useState(4);
  const gridRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  const needle = fold(query.trim());
  const matched = items.filter(
    (item) =>
      (platform === ALL || item.platform === platform) &&
      (!needle || fold(item.title).includes(needle)),
  );
  // One line at rest; "Xem thêm" opens the whole list at once.
  const firstLine = revealLimit(columns);
  const limit = expanded ? matched.length : firstLine;
  const shown = matched.slice(0, limit);
  const hidden = hiddenAfter(matched.length, limit);
  const hasTiles = shown.length > 0;

  // Read the grid's real column count, and again whenever it is resized
  // across a breakpoint, so "one line" holds on a phone and a desktop.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const update = () => setColumns(columnsOf(getComputedStyle(grid).gridTemplateColumns));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    return () => observer.disconnect();
    // The grid element only exists while something matches, so it has to be
    // re-observed when the empty state gives way to tiles again.
  }, [hasTiles]);

  // A fold that is still playing when the component goes must not fire
  // into nothing.
  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  function settle() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setClosing(false);
  }

  function ask(next: { query?: string; platform?: CategoryPlatform | typeof ALL }) {
    if (next.query !== undefined) setQuery(next.query);
    if (next.platform !== undefined) setPlatform(next.platform);
    settle();
    setExpanded(false);
  }

  /** Plays the opened tiles out, bottom first, then folds to one line. */
  function collapse() {
    if (closing) return;
    const leaving = shown.length - firstLine;
    if (leaving <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setExpanded(false);
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      setClosing(false);
      setExpanded(false);
    }, OUT_MS + OUT_STAGGER_MS * (leaving - 1));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The search pill lmarket.net's hero wears, in the shop's red — the
          shape and the comet of light running round the border — over the
          category page's own dark glass: the shop tried lmarket's brighter
          fill with its sheen and highlight and asked for the quiet one back.
          The accent takes the border and the icon while the field has focus.
          As wide as the grid under it, so the field and the tiles share
          their outer edges. The beam comes first and cannot be clicked; the
          icon, field and clear button are positioned so they paint over it. */}
      <label
        htmlFor={inputId}
        className="group/search relative isolate flex h-12 w-full items-center gap-2.5 rounded-full border border-neutral-800/60 bg-neutral-900/60 px-4 transition-colors focus-within:border-[var(--menzu-accent)]/60"
      >
        <BorderBeam />
        <Search
          size={15}
          aria-hidden
          className="relative shrink-0 text-neutral-500 transition-colors group-focus-within/search:text-[var(--menzu-accent)]"
        />
        <input
          // Password managers and similar extensions stamp their own attributes
          // onto text inputs before React hydrates; without this the dev overlay
          // reports a mismatch the app did not cause (production patches it quietly).
          suppressHydrationWarning
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => ask({ query: event.target.value })}
          placeholder={placeholder}
          autoComplete="off"
          className="relative min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-neutral-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button
            type="button"
            onClick={() => ask({ query: "" })}
            aria-label="Xoá tìm kiếm"
            className="relative shrink-0 rounded-md p-0.5 text-neutral-500 transition-colors hover:text-white"
          >
            <X size={14} />
          </button>
        ) : null}
      </label>

      {/* One chip per platform, "Tất cả" first. A radio group in all but
          markup: exactly one is lit, and pressing the lit one changes nothing. */}
      <div role="group" aria-label="Phân loại" className="flex flex-wrap items-center gap-2">
        {[ALL, ...CATEGORY_PLATFORMS].map((value) => {
          const active = platform === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => ask({ platform: value as CategoryPlatform | typeof ALL })}
              className={`${CHIP} ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              {value === ALL ? "Tất cả" : platformLabel(value)}
            </button>
          );
        })}
      </div>

      {hasTiles ? (
        <>
          <div
            ref={gridRef}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pt-1"
          >
            {shown.map((item, index) => {
              // Tiles the press just opened rise in one after another, the
              // page's own fade-up, 40ms apart — the first line has been on
              // screen all along and stays put. `backwards` keeps a delayed
              // tile invisible until its turn, so nothing flashes in early.
              // On "Thu gọn" the same tiles play out, the last one first, and
              // `forwards` holds each at its vanished frame until they go.
              const revealed = expanded && index >= firstLine;
              const leaving = shown.length - firstLine;
              const seat = index - firstLine;
              return (
                <div
                  key={item.key}
                  className={
                    revealed
                      ? closing
                        ? "animate-fade-down motion-reduce:animate-none"
                        : "animate-fade-up motion-reduce:animate-none"
                      : undefined
                  }
                  style={
                    revealed
                      ? closing
                        ? {
                            animationDelay: `${(leaving - 1 - seat) * OUT_STAGGER_MS}ms`,
                            animationFillMode: "forwards",
                          }
                        : { animationDelay: `${seat * IN_STAGGER_MS}ms`, animationFillMode: "backwards" }
                      : undefined
                  }
                >
                  {item.node}
                </div>
              );
            })}
          </div>

          {/* "Xem thêm" says how much is left, so the press is a known
              quantity; once everything is out, the same spot folds the row
              back to its first line. */}
          {hidden > 0 ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="group inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.03] px-5 text-[11px] font-black uppercase tracking-widest text-neutral-200 transition-colors hover:border-[var(--menzu-accent)]/50 hover:bg-[var(--menzu-accent)]/10 hover:text-[var(--menzu-accent)]"
              >
                Xem thêm
                <span className="text-neutral-500">({hidden})</span>
                <ChevronDown size={14} aria-hidden className="transition-transform group-hover:translate-y-0.5" />
              </button>
            </div>
          ) : expanded ? (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={collapse}
                disabled={closing}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.03] px-5 text-[11px] font-black uppercase tracking-widest text-neutral-400 transition-colors hover:border-white/25 hover:text-white disabled:opacity-60"
              >
                Thu gọn
                <ChevronUp size={14} aria-hidden />
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-[15px] border border-dashed border-white/10 bg-white/[0.02] px-5 py-10 text-center">
          <p className="text-sm font-bold text-white">
            {needle
              ? `Không có game nào khớp “${query.trim()}”`
              : `Chưa có game nào ở mục ${platformLabel(platform)}`}
          </p>
          <p className="text-[12px] text-neutral-400">
            {needle
              ? "Thử tên khác, chọn mục khác, hoặc xem toàn bộ danh mục."
              : "Chọn mục khác, hoặc xem toàn bộ danh mục."}
          </p>
          <Link
            href={viewAllHref}
            className="mt-1 text-[11px] font-black uppercase tracking-widest text-[var(--menzu-accent)] hover:text-white transition-colors"
          >
            Xem tất cả danh mục
          </Link>
        </div>
      )}
    </div>
  );
}
