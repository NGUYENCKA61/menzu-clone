"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  BookOpen,
  Eye,
  HelpCircle,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { FaqAccordion } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FaqAccordion";
import type { FaqEntry } from "@/lib/settings";

export type DocCategoryKey = "FAQ" | "GUIDE" | "WARRANTY";

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
  /** Pinned onto the featured card from admin; at most one article is. */
  featured: boolean;
}

export interface HelpContact {
  facebook: string;
  zalo: string;
  telegram: string;
}

/** The three shelves the shop files its articles on, in the rail's order.
 *  `short` is the rail's word, where 220px is all the room there is. */
const TABS: { key: DocCategoryKey; label: string; short: string; heading: string; icon: LucideIcon }[] = [
  { key: "FAQ", label: "FAQ", short: "FAQ", heading: "Câu hỏi thường gặp", icon: HelpCircle },
  { key: "GUIDE", short: "Hướng dẫn", label: "Hướng dẫn", heading: "Hướng dẫn", icon: BookOpen },
  { key: "WARRANTY", short: "Bảo hành", label: "Chính sách bảo hành", heading: "Chính sách bảo hành", icon: ShieldCheck },
];

const LIST_ID = "docs-list";

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const formatDate = (iso: string) => dateFormat.format(new Date(iso));
const formatViews = (n: number) => n.toLocaleString("vi-VN");

function isTab(value: string): value is DocCategoryKey {
  return value === "FAQ" || value === "GUIDE" || value === "WARRANTY";
}

/** The URL hash as an external store, so a render can read it without an
 *  effect and the server, which has none, can render the FAQ shelf. */
function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const readHash = () => window.location.hash;
const readNoHash = () => "";

/**
 * The wiki index as a help centre: a search box over everything, a rail of
 * the three shelves on the left, the shelf's contents in the middle under a
 * featured guide, and on the right the newest articles, three quick doors
 * and the way to a human. The FAQ shelf shows the same questions the home
 * page answers (Cấu hình → FAQ), in the same accordion, so the shop edits
 * them in one place.
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
  // The footer still links /docs#FAQ and /docs#WARRANTY, as it did when the
  // shelves were sections down one long page. The hash picks the shelf until
  // the reader picks one themselves.
  const hash = useSyncExternalStore(subscribeHash, readHash, readNoHash);
  const hashKey = hash.replace("#", "").toUpperCase();
  const hashTab: DocCategoryKey | null = isTab(hashKey) ? hashKey : null;
  const [chosen, setChosen] = useState<DocCategoryKey | null>(null);
  const [query, setQuery] = useState("");
  const tab = chosen ?? hashTab ?? "FAQ";
  /** Bumped by a shelf press; the scroll to the list runs once the new
   *  shelf has been laid out, not before. */
  const [jump, setJump] = useState(0);

  useEffect(() => {
    if (hashTab) document.getElementById(LIST_ID)?.scrollIntoView({ block: "start" });
  }, [hashTab]);

  // After the commit, so the browser measures the shelf that is actually
  // there. Scrolling from the press handler fixed the target by the OLD
  // layout, and a shorter shelf then left the smooth scroll running to a
  // point that no longer existed, pinned at the foot of the document.
  useEffect(() => {
    if (jump === 0) return;
    document.getElementById(LIST_ID)?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [jump]);

  const q = query.trim().toLowerCase();
  const matches = (text: string) => q === "" || text.toLowerCase().includes(q);
  const shelf = (key: DocCategoryKey) => articles.filter((a) => a.category === key);

  const faqItems = faq.filter((entry) => matches(entry.q) || matches(entry.a));
  const shelfArticles = shelf(tab).filter((a) => matches(a.title));
  const shown = tab === "FAQ" ? faqItems.length + shelfArticles.length : shelfArticles.length;

  // Counted against the search, like the list: a rail that says "12" beside
  // a shelf the box has just emptied is arguing with the page.
  const onShelf = (key: DocCategoryKey) => shelf(key).filter((a) => matches(a.title)).length;
  const counts: Record<DocCategoryKey, number> = {
    FAQ: faqItems.length + onShelf("FAQ"),
    GUIDE: onShelf("GUIDE"),
    WARRANTY: onShelf("WARRANTY"),
  };

  // The pinned article leads (admin: "Ghim lên Nội dung nổi bật"); with none
  // pinned the most-read guide does, and a shop with no guides yet leads with
  // its most-read article of any kind.
  const guides = shelf("GUIDE");
  const featured =
    articles.find((a) => a.featured) ??
    (guides.length > 0 ? guides : articles).slice().sort((a, b) => b.views - a.views)[0] ??
    null;

  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  function openShelf(key: DocCategoryKey) {
    setChosen(key);
    setQuery("");
    setJump((j) => j + 1);
  }

  return (
    // The account area's frame (the owner, 29/09/2026: "đồng bộ"): the shelves
    // as its sidebar, then one panel with the title, the search beside it and
    // everything else inside.
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* min-w-0: the chip row below lg counts every button towards the
          column's minimum, which pushed a 390px phone past its right edge. */}
      <aside className="min-w-0 w-full lg:w-[280px] shrink-0 lg:sticky lg:top-[120px]">
        <nav aria-label="Danh mục Wiki" className="bg-neutral-900/60 border border-white/10 rounded-2xl p-3">
          <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-neutral-500">
            Danh mục
          </p>
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {TABS.map((t) => {
              const Icon = t.icon;
              const on = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => openShelf(t.key)}
                  aria-pressed={on}
                  className={`relative flex shrink-0 items-center gap-3 py-2.5 px-3 rounded-lg text-sm font-bold text-left transition-colors lg:shrink ${
                    on
                      ? "bg-[var(--menzu-accent)]/10 text-white"
                      : "text-neutral-300 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon
                    size={16}
                    aria-hidden
                    className={`shrink-0 ${on ? "text-[var(--menzu-accent)]" : "text-neutral-500"}`}
                  />
                  <span className="flex-1 whitespace-nowrap">{t.short}</span>
                  <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500">{counts[t.key]}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      <div className="flex-1 w-full min-w-0">
        <div className="w-full bg-transparent sm:bg-[#171920] border-0 sm:border sm:border-white/5 rounded-none sm:rounded-[24px] p-0 sm:p-8 lg:p-10 relative min-h-0 sm:min-h-[750px]">
          <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider mb-2 flex items-center gap-3">
                <BookOpen size={24} className="shrink-0 text-[var(--menzu-accent)]" aria-hidden />
                Wiki &amp; Hướng dẫn
              </h1>
              <p className="max-w-xl text-xs sm:text-sm text-neutral-400 leading-relaxed">
                Hướng dẫn sử dụng, chính sách bảo hành, câu hỏi thường gặp và những thông tin cần
                thiết khi dùng dịch vụ tại cửa hàng.
              </p>
            </div>
            <label className="group relative block w-full shrink-0 xl:w-72">
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
                className="relative h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition-colors focus:border-[var(--menzu-accent)]/50"
              />
            </label>
          </div>

        {/* Middle: the featured guide, then the open shelf. */}
        <div className="min-w-0 space-y-8">
          {featured ? (
            <section className="space-y-3">
              <SectionHead label="Nội dung nổi bật" note="Được quan tâm" />
              <Link
                href={`/docs/${featured.slug}`}
                className="group relative isolate block overflow-hidden rounded-2xl border border-[var(--menzu-accent)]/25 bg-gradient-to-br from-[var(--menzu-accent)]/[0.12] via-white/[0.02] to-white/[0.02] p-6 lift-card hover:-translate-y-1 hover:border-[var(--menzu-accent)]/50 hover:shadow-xl hover:shadow-black/40"
              >
                {/* The article's own picture, faded and washed out towards the
                    text, so the card reads as that article and not a box. */}
                <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-3/5 opacity-25 [mask-image:linear-gradient(to_left,black,transparent)]">
                  <Image src={featured.thumbnailUrl} alt="" fill sizes="40vw" className="object-cover" />
                </div>
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-20 -top-20 -z-10 h-64 w-64 rounded-full bg-[var(--menzu-accent)]/15 blur-3xl"
                />
                <span className="inline-flex rounded-md border border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--menzu-accent)]">
                  Hướng dẫn quan trọng
                </span>
                <h3 className="mt-3 text-xl font-black leading-tight text-white transition-colors group-hover:text-[var(--menzu-accent)]">
                  {featured.title}
                </h3>
                {featured.excerpt ? (
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400">
                    {featured.excerpt}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--menzu-accent)] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-colors group-hover:bg-[var(--menzu-accent-dark)]">
                    Xem hướng dẫn
                    <ArrowRight size={12} aria-hidden />
                  </span>
                  <span className="flex items-center gap-3 text-[10px] font-bold text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <Eye size={11} aria-hidden />
                      {formatViews(featured.views)} lượt xem
                    </span>
                    <span>{formatDate(featured.publishedAt)}</span>
                  </span>
                </div>
              </Link>
            </section>
          ) : null}

          <section id={LIST_ID} className="scroll-mt-[120px] space-y-3">
            <SectionHead label={active.heading} note={active.label} />

            {tab === "FAQ" && faqItems.length > 0 ? <FaqAccordion items={faqItems} /> : null}

            {shelfArticles.length > 0 ? (
              <div className={tab === "FAQ" && faqItems.length > 0 ? "pt-3" : ""}>
                <ArticleRows items={shelfArticles} />
              </div>
            ) : null}

            {shown === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-neutral-500">
                {q ? (
                  <>
                    Không tìm thấy kết quả cho <span className="font-bold text-white">&ldquo;{query.trim()}&rdquo;</span>.
                  </>
                ) : (
                  "Mục này chưa có bài viết."
                )}
              </div>
            ) : null}
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-sm font-black uppercase tracking-widest text-white">
        <span aria-hidden className="h-4 w-0.5 rounded-full bg-[var(--menzu-accent)]" />
        {label}
      </h2>
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">{note}</span>
    </div>
  );
}

function ArticleRows({ items }: { items: DocCard[] }) {
  // Two up with the cover on top: the column is wide since the right rail
  // went, and a full-width strip with a 96px picture read as empty.
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((article) => (
        <Link
          key={article.slug}
          href={`/docs/${article.slug}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] lift-card hover:-translate-y-1 hover:border-[var(--menzu-accent)]/40 hover:shadow-lg hover:shadow-black/40"
        >
          <div className="relative aspect-video w-full overflow-hidden bg-black/40">
            <Image
              src={article.thumbnailUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 420px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-[var(--menzu-accent)]">
              {article.title}
            </h3>
            <div className="mt-auto flex items-center gap-3 text-[11px] font-bold text-neutral-500">
              <span>{formatDate(article.publishedAt)}</span>
              <span className="inline-flex items-center gap-1">
                <Eye size={12} aria-hidden />
                {formatViews(article.views)} lượt xem
              </span>
              <ArrowRight
                size={15}
                aria-hidden
                className="ml-auto shrink-0 text-neutral-600 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--menzu-accent)]"
              />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
