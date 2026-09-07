"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Eye,
  FileText,
  HelpCircle,
  MessageCircle,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

import { FaqAccordion } from "@/components/sites/menzu-lol-f7ae197a/root-8a5edab2/FaqAccordion";
import type { FaqEntry } from "@/lib/settings";
import { STATUS_TAB_HREF } from "@/lib/softwareStatus";
import { SUPPORT_WINDOW } from "@/lib/supportHours";

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
  contact,
}: {
  articles: DocCard[];
  faq: FaqEntry[];
  contact: HelpContact;
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

  useEffect(() => {
    if (hashTab) document.getElementById(LIST_ID)?.scrollIntoView({ block: "start" });
  }, [hashTab]);

  const q = query.trim().toLowerCase();
  const matches = (text: string) => q === "" || text.toLowerCase().includes(q);
  const shelf = (key: DocCategoryKey) => articles.filter((a) => a.category === key);

  const faqItems = faq.filter((entry) => matches(entry.q) || matches(entry.a));
  const shelfArticles = shelf(tab).filter((a) => matches(a.title));
  const shown = tab === "FAQ" ? faqItems.length + shelfArticles.length : shelfArticles.length;

  const counts: Record<DocCategoryKey, number> = {
    FAQ: faq.length + shelf("FAQ").length,
    GUIDE: shelf("GUIDE").length,
    WARRANTY: shelf("WARRANTY").length,
  };

  // The pinned article leads (admin: "Ghim lên Nội dung nổi bật"); with none
  // pinned the most-read guide does, and a shop with no guides yet leads with
  // its most-read article of any kind.
  const guides = shelf("GUIDE");
  const featured =
    articles.find((a) => a.featured) ??
    (guides.length > 0 ? guides : articles).slice().sort((a, b) => b.views - a.views)[0] ??
    null;

  const latest = articles
    .slice()
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const zaloDigits = contact.zalo.replace(/\D/g, "");
  const doors = [
    contact.facebook
      ? { key: "facebook", href: contact.facebook, label: "Nhắn Facebook", Icon: MessageCircle }
      : null,
    zaloDigits
      ? { key: "zalo", href: `https://zalo.me/${zaloDigits}`, label: "Chat Zalo", Icon: MessageSquare }
      : null,
    contact.telegram
      ? { key: "telegram", href: contact.telegram, label: "Kênh Telegram", Icon: Send }
      : null,
  ].filter((door): door is NonNullable<typeof door> => door !== null);

  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  function openShelf(key: DocCategoryKey) {
    setChosen(key);
    setQuery("");
    document.getElementById(LIST_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="space-y-8">
      {/* Intro on the left, the search on the right — one row on a desktop. */}
      <div className="-mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <p className="max-w-2xl text-sm leading-relaxed text-neutral-400">
          Tìm nhanh hướng dẫn sử dụng, chính sách bảo hành, câu hỏi thường gặp và
          những thông tin cần thiết khi dùng dịch vụ tại cửa hàng.
        </p>
        <label className="group relative block w-full shrink-0 lg:w-80">
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
            className="relative h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none transition-[border-color,box-shadow,background-color] hover:bg-white/[0.08] focus:border-[var(--menzu-accent)]/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--menzu-accent)]/25"
          />
        </label>
      </div>

      <div className="h-px bg-gradient-to-r from-[var(--menzu-accent)]/30 via-white/10 to-transparent" />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_300px] lg:items-start">
        {/* Left rail: the shelves. A row of chips below lg, a column above. */}
        <aside className="lg:sticky lg:top-[120px]">
          <div className="rounded-2xl border border-white/10 bg-[#121216] p-3">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-widest text-neutral-500">
              Danh mục
            </p>
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:overflow-visible [&::-webkit-scrollbar]:hidden">
              {TABS.map((t) => {
                const Icon = t.icon;
                const on = t.key === tab;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => openShelf(t.key)}
                    aria-pressed={on}
                    className={`relative flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition-colors lg:shrink ${
                      on
                        ? "border-[var(--menzu-accent)]/25 bg-[var(--menzu-accent)]/10 text-white"
                        : "border-transparent text-neutral-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {on ? (
                      <span className="absolute bottom-2 left-0 top-2 w-0.5 rounded-full bg-[var(--menzu-accent)]" />
                    ) : null}
                    <Icon
                      size={15}
                      aria-hidden
                      className={`shrink-0 ${on ? "text-[var(--menzu-accent)]" : "text-neutral-500"}`}
                    />
                    <span className="flex-1 whitespace-nowrap">{t.short}</span>
                    <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500">{counts[t.key]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Middle: the featured guide, then the open shelf. */}
        <div className="min-w-0 space-y-8">
          {featured ? (
            <section className="space-y-3">
              <SectionHead label="Nội dung nổi bật" note="Được quan tâm" />
              <Link
                href={`/docs/${featured.slug}`}
                className="group relative isolate block overflow-hidden rounded-2xl border border-[var(--menzu-accent)]/25 bg-gradient-to-br from-[var(--menzu-accent)]/[0.12] via-[#121216] to-[#121216] p-6 transition-all hover:-translate-y-0.5 hover:border-[var(--menzu-accent)]/50 hover:shadow-xl hover:shadow-black/40"
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

        {/* Right rail: newest, quick doors, a human. */}
        <aside className="space-y-5">
          <Panel
            title="Bài viết mới"
            action={
              latest.length > 0
                ? { label: "Xem tất cả", onClick: () => openShelf(latest[0]!.category) }
                : undefined
            }
          >
            {latest.length > 0 ? (
              <div className="divide-y divide-white/5">
                {latest.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/docs/${article.slug}`}
                    className="group -mx-1 flex items-center gap-3 rounded-lg px-1 py-2.5 transition-colors hover:bg-white/[0.03] first:pt-0 last:pb-0"
                  >
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-black/40">
                      <Image
                        src={article.thumbnailUrl}
                        alt=""
                        fill
                        sizes="128px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-[12px] font-bold leading-snug text-white transition-colors group-hover:text-[var(--menzu-accent)]">
                        {article.title}
                      </p>
                      <p className="mt-0.5 text-[10px] font-bold text-neutral-500">
                        {formatDate(article.publishedAt)} · {formatViews(article.views)} lượt xem
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">Chưa có bài viết.</p>
            )}
          </Panel>

          <Panel title="Truy cập nhanh">
            <div className="divide-y divide-white/5">
              <QuickDoor
                Icon={FileText}
                title="Hướng dẫn mua hàng"
                note="Quy trình mua sản phẩm"
                href={featured ? `/docs/${featured.slug}` : undefined}
                onClick={featured ? undefined : () => openShelf("GUIDE")}
              />
              <QuickDoor
                Icon={ShieldCheck}
                title="Chính sách bảo hành"
                note="Điều kiện & thời hạn"
                onClick={() => openShelf("WARRANTY")}
              />
              <QuickDoor
                Icon={Activity}
                title="Kiểm tra trạng thái"
                note="Trạng thái các tool"
                href={STATUS_TAB_HREF}
              />
            </div>
          </Panel>

          <div className="rounded-2xl border border-[var(--menzu-accent)]/25 bg-gradient-to-b from-[var(--menzu-accent)]/[0.08] to-white/[0.02] p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--menzu-accent)]/40 bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]">
              <MessageCircle size={16} aria-hidden />
            </span>
            <h3 className="mt-3 text-sm font-black text-white">Không tìm thấy câu trả lời?</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-400">
              Liên hệ đội ngũ hỗ trợ nếu bạn cần trợ giúp với đơn hàng hoặc sản phẩm.
              Hỗ trợ {SUPPORT_WINDOW} mỗi ngày.
            </p>
            {doors.length > 0 ? (
              <a
                href={doors[0]!.href}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex h-10 items-center justify-center rounded-lg bg-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent)]"
              >
                Liên hệ hỗ trợ
              </a>
            ) : (
              <Link
                href="/feedback"
                className="mt-4 flex h-10 items-center justify-center rounded-lg bg-white/10 text-[10px] font-black uppercase tracking-widest text-white transition-colors hover:bg-[var(--menzu-accent)]"
              >
                Liên hệ hỗ trợ
              </Link>
            )}
            {doors.length > 1 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {doors.map(({ key, href, label, Icon }) => (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-[10px] font-bold text-neutral-300 transition-colors hover:border-[var(--menzu-accent)]/50 hover:text-white"
                  >
                    <Icon size={12} aria-hidden />
                    {label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
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

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121216] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-white">{title}</h3>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="text-[10px] font-black uppercase tracking-widest text-[var(--menzu-accent)] hover:underline"
          >
            {action.label}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** A row in "Truy cập nhanh": a page when it has an href, a shelf otherwise. */
function QuickDoor({
  Icon,
  title,
  note,
  href,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  note: string;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-400 transition-colors group-hover:border-[var(--menzu-accent)]/40 group-hover:text-[var(--menzu-accent)]">
        <Icon size={14} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-bold text-white transition-colors group-hover:text-[var(--menzu-accent)]">
          {title}
        </span>
        <span className="block text-[10px] font-bold text-neutral-500">{note}</span>
      </span>
    </>
  );
  const className = "group flex w-full items-center gap-3 py-2.5 text-left first:pt-0 last:pb-0";
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  );
}

function ArticleRows({ items }: { items: DocCard[] }) {
  return (
    <div className="grid gap-3">
      {items.map((article) => (
        <Link
          key={article.slug}
          href={`/docs/${article.slug}`}
          className="group flex items-center gap-4 rounded-xl border border-white/10 bg-[#121216] p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--menzu-accent)]/50 hover:bg-white/[0.03] hover:shadow-lg hover:shadow-black/40"
        >
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-black/40">
            <Image
              src={article.thumbnailUrl}
              alt=""
              fill
              sizes="192px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-white transition-colors group-hover:text-[var(--menzu-accent)]">
              {article.title}
            </h3>
            <div className="mt-1.5 flex items-center gap-3 text-[10px] font-bold text-neutral-500">
              <span>{formatDate(article.publishedAt)}</span>
              <span className="inline-flex items-center gap-1">
                <Eye size={11} aria-hidden />
                {formatViews(article.views)}
              </span>
            </div>
          </div>
          <ArrowRight
            size={16}
            aria-hidden
            className="shrink-0 text-neutral-600 transition-all group-hover:translate-x-0.5 group-hover:text-[var(--menzu-accent)]"
          />
        </Link>
      ))}
    </div>
  );
}
