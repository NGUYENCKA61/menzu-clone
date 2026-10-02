"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ArrowRight, ChevronRight, Search } from "lucide-react";

import { FaqAccordion } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FaqAccordion";
import { ListPager } from "@/components/sites/menzu-lol-f7ae197a/shared/AccountListChrome";
import { DOC_SHELF_META } from "@/components/sites/menzu-lol-f7ae197a/shared/docShelfMeta";
import { DOC_SHELF_LABEL, DOC_SHELVES, isDocShelf, type DocShelf } from "@/lib/docCategories";
import type { FaqEntry } from "@/lib/settings";

export type DocCategoryKey = DocShelf;

export interface DocCard {
  slug: string;
  title: string;
  category: DocCategoryKey;
  /** One sentence for the featured card; "" when the article has none. */
  excerpt: string;
  thumbnailUrl: string;
  views: number;
  /** ISO string — a Date cannot cross the server/client boundary. */
  publishedAt: string;
  /** Pinned onto the featured card from admin; any number may be. */
  featured: boolean;
}

/** How long a featured article holds before the next fades in: longer than
 *  the home page's pictures (4s), as these carry words to read. */
const FEATURED_HOLD_MS = 6000;
/** The featured card turns through at least this many articles when the shop
 *  has them (pins topped up by the most-read), and never more than the max. */
const FEATURED_MIN = 3;
const FEATURED_MAX = 6;

/**
 * "Nội dung nổi bật", taking turns (the owner, 02/10/2026: "có nhiều bài viết
 * đổi qua bằng hiệu ứng như ảnh", "mấy cái chấm thanh nọ đó"): the home
 * page's picture carousel, for articles — each fades into the next, and the
 * dots in the corner, the open one a red bar, jump straight to one. A hand
 * on the card (hover or focus) holds the turn so its words can be read; a
 * reader who asks for less motion gets no turning at all, only the dots.
 */
function FeaturedCarousel({ items }: { items: DocCard[] }) {
  const [active, setActive] = useState(0);
  /** Bumped by a dot press, so the clock restarts instead of firing early. */
  const [turn, setTurn] = useState(0);
  const [still, setStill] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setStill(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (still || held || items.length < 2) return;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % items.length),
      FEATURED_HOLD_MS,
    );
    return () => window.clearInterval(timer);
  }, [still, held, items.length, turn]);

  const shown = Math.min(active, items.length - 1);

  return (
    <div
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocusCapture={() => setHeld(true)}
      onBlurCapture={() => setHeld(false)}
    >
      <div
        className="group relative isolate overflow-hidden rounded-2xl border border-[var(--menzu-accent)]/25 bg-gradient-to-br from-[var(--menzu-accent)]/[0.10] via-[#121216] to-[#121216] lift-card hover:-translate-y-1 hover:border-[var(--menzu-accent)]/50 hover:shadow-xl hover:shadow-black/40"
      >
        {/* All the articles stacked in one cell, so the card is as tall as the
            tallest and does not jump as they change. */}
        <div className="grid">
          {items.map((item, index) => {
            const on = index === shown;
            return (
              <Link
                key={item.slug}
                href={`/docs/${item.slug}`}
                aria-hidden={on ? undefined : true}
                tabIndex={on ? undefined : -1}
                className={`relative isolate block p-6 [grid-area:1/1] ${items.length > 1 ? "pb-12" : ""} transition-opacity duration-[900ms] ease-out motion-reduce:transition-none ${
                  on ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
              >
                {/* The article's own picture, faded towards the text, so the
                    card reads as that article and not a box. */}
                <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-3/5 opacity-25 [mask-image:linear-gradient(to_left,black,transparent)]">
                  <Image src={item.thumbnailUrl} alt="" fill sizes="40vw" className="object-cover" />
                </div>
                <span className="inline-flex rounded-md border border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--menzu-accent)]">
                  Nội dung nổi bật
                </span>
                <h2 className="mt-3 text-xl font-black leading-tight text-white transition-colors group-hover:text-[var(--menzu-accent)]">
                  {item.title}
                </h2>
                {item.excerpt ? (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400">{item.excerpt}</p>
                ) : null}
                {/* Reads and date right beside the button, on the text's side:
                    pushed to the far edge they sat on the picture's logo
                    (the owner, 02/10/2026: "làm cái 9"). */}
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--menzu-accent)] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors group-hover:bg-[var(--menzu-accent-dark)]">
                    Xem chi tiết
                    <ArrowRight size={12} aria-hidden />
                  </span>
                  <span className="text-[11px] font-semibold text-neutral-500">
                    {formatViews(item.views)} lượt xem · {formatDate(item.publishedAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
        {/* The dots centred on the card's foot (the owner, 02/10/2026: "mấy cái
            chấm đó nằm giữa", "nằm trong card"), on room the slides leave
            for them so they never sit on the button or the line beside it. */}
        {items.length > 1 ? (
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2 py-1.5 backdrop-blur-md">
            {items.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                aria-label={`Bài ${index + 1} trên ${items.length}: ${item.title}`}
                aria-current={index === shown ? "true" : undefined}
                onClick={() => {
                  setActive(index);
                  setTurn((count) => count + 1);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                  index === shown
                    ? "w-[18px] bg-[var(--menzu-accent)]"
                    : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface HelpContact {
  facebook: string;
  zalo: string;
  telegram: string;
}

/** Cards per page on a shelf, or in the search's results. */
const PER_PAGE = 6;
const LIST_ID = "docs-list";

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const formatDate = (iso: string) => dateFormat.format(new Date(iso));
const formatViews = (n: number) => n.toLocaleString("vi-VN");

/** The URL hash as an external store, so a render can read it without an
 *  effect and the server, which has none, can render the FAQ shelf. */
function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const readHash = () => window.location.hash;
const readNoHash = () => "";

/**
 * The search, shared between its box in the page's title row and the list
 * it filters (the owner, 01/10/2026: "bổ sung cái search trên góc search đc
 * bài viết"). The provider wraps the whole page so both can reach it.
 */
const SearchContext = createContext<{ query: string; setQuery: (next: string) => void } | null>(
  null,
);

export function DocsSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const value = useMemo(() => ({ query, setQuery }), [query]);
  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

function useDocsSearch() {
  const search = useContext(SearchContext);
  if (!search) throw new Error("DocsSearchProvider is missing");
  return search;
}

/** The box itself, for the title row: it looks through every shelf. */
export function DocsSearchBox() {
  const { query, setQuery } = useDocsSearch();
  return (
    <label className="group relative block w-full shrink-0 sm:w-80">
      <Search
        size={15}
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-neutral-500 transition-colors group-focus-within:text-[var(--menzu-accent)]"
      />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm kiếm bài viết..."
        aria-label="Tìm kiếm bài viết"
        className="relative h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition-[border-color,box-shadow,background-color] hover:bg-white/[0.08] focus:border-[var(--menzu-accent)]/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--menzu-accent)]/25"
      />
    </label>
  );
}

/**
 * The wiki index (the owner's list, 01/10/2026): the featured article on top
 * in place of the old introduction, then the five shelves on the left — FAQ,
 * Khái niệm và thuật ngữ, Hướng dẫn, Chính sách, Các điều khoản chung — and
 * the open shelf on the right. FAQ is the shop's own questions (Cấu hình →
 * FAQ, the same the home page answers), no articles; the other shelves are
 * the orders list's cards, six to a page, each with its "Chi tiết". Fewer
 * marks than before: no counts, no icons on the shelves or the questions.
 * A search looks through every shelf at once.
 */
export function DocsHelpCenter({
  articles,
  faq,
}: {
  articles: DocCard[];
  faq: FaqEntry[];
  /** No longer drawn: the right rail (newest, quick doors, the contact
   *  card) was dropped on the owner's word, 29/09/2026. */
  contact?: HelpContact;
}) {
  const { query, setQuery } = useDocsSearch();
  // The footer still links /docs#FAQ and /docs#WARRANTY, as it did when the
  // shelves were sections down one long page. The hash picks the shelf until
  // the reader picks one themselves.
  const hash = useSyncExternalStore(subscribeHash, readHash, readNoHash);
  const hashKey = hash.replace("#", "").toUpperCase();
  const hashTab: DocShelf | null = isDocShelf(hashKey) ? hashKey : null;
  const [chosen, setChosen] = useState<DocShelf | null>(null);
  const tab = chosen ?? hashTab ?? "FAQ";
  /** Bumped by a page turn in the list; the scroll back to the list's top
   *  runs once the new page has been laid out, not before. A shelf press
   *  does not bump it: the page stays where the reader is (the owner,
   *  02/10/2026: "bỏ cái script ấn các danh mục bị kéo xuống đi"). */
  const [jump, setJump] = useState(0);

  useEffect(() => {
    if (hashTab) document.getElementById(LIST_ID)?.scrollIntoView({ block: "start" });
  }, [hashTab]);

  // After the commit, so the browser measures the shelf that is actually
  // there — scrolling from the press handler aimed at the OLD layout.
  useEffect(() => {
    if (jump === 0) return;
    document.getElementById(LIST_ID)?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [jump]);

  const q = query.trim().toLowerCase();
  const searching = q !== "";
  const matches = (text: string) => text.toLowerCase().includes(q);

  const foundFaq = searching ? faq.filter((entry) => matches(entry.q) || matches(entry.a)) : [];
  const list = searching
    ? articles.filter((a) => matches(a.title) || matches(a.excerpt))
    : tab === "FAQ"
      ? []
      : articles.filter((a) => a.category === tab);

  // The page belongs to the list it was turned on: a new shelf or a new search
  // starts again at the first page, without an effect to reset it.
  const listKey = searching ? `q:${q}` : `tab:${tab}`;
  const [paging, setPaging] = useState({ key: listKey, page: 0 });
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = paging.key === listKey ? Math.min(paging.page, pageCount - 1) : 0;
  const shown = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);

  // The featured card's turn: every pinned article (admin: "Ghim lên Nội dung
  // nổi bật"), newest first, topped up with the most-read guides and then
  // the most-read of the rest until it has FEATURED_MIN to turn through.
  const featured = useMemo(() => {
    const byViews = (list: DocCard[]) => list.slice().sort((a, b) => b.views - a.views);
    const pinned = articles
      .filter((a) => a.featured)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    const rest = [
      ...byViews(articles.filter((a) => !a.featured && a.category === "GUIDE")),
      ...byViews(articles.filter((a) => !a.featured && a.category !== "GUIDE")),
    ];
    return [...pinned, ...rest.slice(0, Math.max(0, FEATURED_MIN - pinned.length))].slice(
      0,
      FEATURED_MAX,
    );
  }, [articles]);

  function openShelf(key: DocShelf) {
    setChosen(key);
    setQuery("");
  }

  const heading = searching ? `Kết quả cho “${query.trim()}”` : DOC_SHELF_LABEL[tab];
  const nothing = searching ? foundFaq.length === 0 && list.length === 0 : tab !== "FAQ" && list.length === 0;

  return (
    <div className="space-y-8">
      {/* The featured articles first, where the introduction used to be (the
          owner: "cái nội dung nổi bật quăng lên trên"), taking turns. Out of
          the way while a search is showing its results. */}
      {featured.length > 0 && !searching ? <FeaturedCarousel items={featured} /> : null}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
        {/* Left rail: the shelves, each with its icon in front, grey and red
            when open, as the account pages' rail draws its items (the owner,
            02/10/2026: "thêm icon"). A row of chips below lg, a column above.
            min-w-0: the chip row counts every button towards the column's
            minimum and pushed a phone's page past its edge. */}
        <aside className="min-w-0 lg:sticky lg:top-[120px]">
          <div className="rounded-2xl border border-white/10 bg-[#121216] p-3">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Danh mục
            </p>
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden">
              {DOC_SHELVES.map((key) => {
                const on = key === tab && !searching;
                const Icon = DOC_SHELF_META[key].icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => openShelf(key)}
                    aria-pressed={on}
                    className={`relative flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition-colors lg:shrink lg:whitespace-normal ${
                      on
                        ? "border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/10 text-white"
                        : "border-transparent text-neutral-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {on ? (
                      <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-[var(--menzu-accent)]" />
                    ) : null}
                    <Icon
                      size={16}
                      aria-hidden
                      className={`shrink-0 ${on ? "text-[var(--menzu-accent)]" : "text-neutral-500"}`}
                    />
                    {DOC_SHELF_LABEL[key]}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <section id={LIST_ID} className="min-w-0 scroll-mt-[120px] space-y-3">
          {/* 16px, a step above the 15px questions it heads (the owner,
              02/10/2026): at 14px it read as a caption, not the list's title. */}
          <h2 className="flex items-center gap-2.5 text-base font-black uppercase tracking-widest text-white">
            <span aria-hidden className="h-4 w-0.5 rounded-full bg-[var(--menzu-accent)]" />
            {heading}
          </h2>

          {searching ? (
            foundFaq.length > 0 ? <FaqAccordion items={foundFaq} plain /> : null
          ) : tab === "FAQ" ? (
            <FaqAccordion items={faq} plain />
          ) : null}

          {shown.length > 0 ? (
            <div className={`flex flex-col gap-3 ${searching && foundFaq.length > 0 ? "pt-3" : ""}`}>
              {shown.map((article) => (
                <ArticleCard key={article.slug} article={article} shelf={searching} />
              ))}
            </div>
          ) : null}

          {nothing ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-neutral-500">
              {searching ? (
                <>
                  Không tìm thấy kết quả cho <span className="font-bold text-white">&ldquo;{query.trim()}&rdquo;</span>.
                </>
              ) : (
                "Mục này chưa có bài viết."
              )}
            </div>
          ) : null}

          <ListPager
            page={page}
            pageCount={pageCount}
            onSelect={(next) => {
              setPaging({ key: listKey, page: next });
              setJump((j) => j + 1);
            }}
          />
        </section>
      </div>
    </div>
  );
}

/**
 * One article as the orders list draws an order (the owner: "tăng kích cỡ
 * card như bên lịch sử mua và thêm nút chi tiết"): its picture at 144px, a
 * 16px title on up to two lines, the date and the reads, and "Chi tiết"
 * behind a hairline. In a search's results it also names its shelf.
 */
function ArticleCard({ article, shelf }: { article: DocCard; shelf: boolean }) {
  return (
    <Link
      href={`/docs/${article.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3.5 outline-none transition-colors hover:border-white/10 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)]/60 sm:flex-row sm:items-center sm:gap-5 sm:p-4"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-5">
        <div className="relative aspect-[3/2] w-24 shrink-0 overflow-hidden rounded-lg border border-white/5 bg-neutral-900 sm:aspect-video sm:w-36 sm:rounded-xl">
          <Image
            src={article.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 288px, 192px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h3 className="line-clamp-2 text-sm font-black leading-snug text-white transition-colors group-hover:text-[var(--menzu-accent)] sm:text-base">
            {article.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {shelf ? (
              <span className="rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-neutral-300">
                {DOC_SHELF_LABEL[article.category]}
              </span>
            ) : null}
            <p className="text-[11px] tabular-nums text-neutral-400 sm:text-xs">
              {formatDate(article.publishedAt)} · {formatViews(article.views)} lượt xem
            </p>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end border-t border-white/5 pt-3 sm:border-t-0 sm:border-l sm:border-white/10 sm:pt-0 sm:pl-5">
        <span className="flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg bg-white/10 px-3 text-xs font-bold text-white transition-colors group-hover:bg-white/20 sm:h-9 sm:px-3.5">
          Chi tiết
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
