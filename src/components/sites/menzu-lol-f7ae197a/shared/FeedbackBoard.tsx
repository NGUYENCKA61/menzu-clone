"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, Star, VenetianMask } from "lucide-react";

import { GAP, pageCount, pageStrip, PER_PAGE } from "@/lib/paging";

/** One review, dates preformatted on the server so both renders agree. */
export interface FeedbackItem {
  name: string;
  avatarUrl: string | null;
  body: string;
  amount: number;
  rating: number;
  service: string;
  imageUrl: string | null;
  anonymous: boolean;
  verified: boolean;
  /** "17:56 18/08/2026" */
  when: string;
  /** Epoch millis, for the sort toggle. */
  ts: number;
}

function formatVnd(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * The same mark the home page's review cards wear, so a reader who saw it
 * there recognises it here. Green on purpose in a red shop: it is the one
 * colour that means "confirmed" everywhere, and the accent is already busy
 * meaning "press this".
 */
export function VerifiedBadge({ size = "w-3.5 h-3.5" }: { size?: string }) {
  return (
    <BadgeCheck
      aria-label="Tài khoản đã xác minh"
      className={`${size} shrink-0 text-emerald-400`}
    />
  );
}

export function ServiceChip({ service, small = false }: { service: string; small?: boolean }) {
  return (
    <span
      className={`${
        small ? "text-[9px] px-1.5" : "text-[10px] px-2"
      } font-bold py-0.5 rounded border whitespace-nowrap shrink-0 text-[var(--menzu-accent)] bg-[var(--menzu-accent)]/10 border-[var(--menzu-accent)]/20`}
    >
      {service}
    </span>
  );
}

export function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-[3px]" aria-label={`${rating} trên 5 sao`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          aria-hidden
          className={n <= rating ? "text-amber-400 fill-amber-400" : "text-white/15"}
        />
      ))}
    </div>
  );
}

export function ReviewAvatar({
  name,
  avatarUrl,
  anonymous,
  compact = false,
}: {
  name: string;
  avatarUrl: string | null;
  anonymous: boolean;
  /** The card's 36px version; the composer's preview keeps the ringed 50px one. */
  compact?: boolean;
}) {
  const box = compact ? "h-9 w-9" : "w-11 h-11 sm:w-[50px] sm:h-[50px]";
  const inner = (
    <div
      className={`${box} flex items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5`}
    >
      {anonymous ? (
        <VenetianMask className="h-4 w-4 text-neutral-400" />
      ) : avatarUrl ? (
        <Image src={avatarUrl} alt="" width={50} height={50} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="text-sm font-black uppercase text-neutral-400">
          {name.trim().slice(0, 1) || "?"}
        </span>
      )}
    </div>
  );
  if (compact) return inner;
  return (
    <div className="relative inline-block shrink-0 rounded-full border-[2.5px] border-[var(--menzu-accent)] p-[2px]">
      {inner}
    </div>
  );
}

/**
 * One review, in the home page's card language: stars first, the words in
 * the middle, who and when at the foot. The service and the amount sit where
 * the home card keeps its amount chip; a photo, when there is one, goes
 * under the words and opens full size on a press.
 */
function ReviewCard({ item }: { item: FeedbackItem }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.16]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <StarRow rating={item.rating} size={14} />
          <ServiceChip service={item.service} small />
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-neutral-500">{item.when}</span>
      </div>

      {item.body ? (
        <p className="flex-1 whitespace-pre-wrap text-[13.5px] leading-relaxed text-neutral-200">
          “{item.body}”
        </p>
      ) : (
        <p className="flex-1 text-[13px] italic text-neutral-600">Không để lại nhận xét</p>
      )}

      {item.imageUrl ? (
        <a
          href={item.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="group/img block w-fit max-w-full cursor-zoom-in overflow-hidden rounded-xl border border-white/10 transition-colors hover:border-white/25"
        >
          {/* Plain img: attachment sizes vary and the file already went
              through sharp on the way in — next/image would re-run it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt="Ảnh đính kèm"
            className="max-h-[220px] w-auto max-w-full object-cover transition-transform duration-500 group-hover/img:scale-[1.03]"
          />
        </a>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <ReviewAvatar name={item.name} avatarUrl={item.avatarUrl} anonymous={item.anonymous} compact />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="truncate text-[13px] font-bold text-white">{item.name}</h3>
              {item.verified ? <VerifiedBadge size="w-3 h-3" /> : null}
            </div>
            <span className="block text-[10px] font-semibold text-neutral-500">
              {item.verified ? "Đã mua · xác minh" : "Khách hàng"}
            </span>
          </div>
        </div>
        {item.amount > 0 ? (
          <span className="shrink-0 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-black tabular-nums text-emerald-400">
            {formatVnd(item.amount)}₫
          </span>
        ) : null}
      </div>
    </article>
  );
}

const CHIP =
  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[11px] font-black uppercase tracking-wider transition-colors";
const CHIP_ON = `${CHIP} border-[var(--menzu-accent)] bg-[var(--menzu-accent)]/10 text-[var(--menzu-accent)]`;
const CHIP_OFF = `${CHIP} border-white/10 bg-white/[0.03] text-neutral-400 hover:border-white/25 hover:text-white`;

const PAGE_BTN =
  "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black transition-colors";
const PAGE_ON = `${PAGE_BTN} bg-[var(--menzu-accent)] text-white`;
const PAGE_OFF = `${PAGE_BTN} border border-white/10 bg-white/[0.03] text-neutral-400 hover:text-white`;
const ARROW_BTN = `${PAGE_OFF} disabled:cursor-not-allowed disabled:opacity-30`;

/**
 * The wall. Filter by stars, newest or oldest first, a page at a time; every
 * choice is local state, since the whole (approved) list arrives with the
 * page and is at most a few hundred rows.
 */
export function FeedbackBoard({ items }: { items: FeedbackItem[] }) {
  const [ratingFilter, setRatingFilter] = useState(0);
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(1);

  const counts = useMemo(() => {
    const byStar = [0, 0, 0, 0, 0, 0];
    for (const item of items) byStar[Math.min(5, Math.max(1, item.rating))] += 1;
    return byStar;
  }, [items]);

  const shown = useMemo(() => {
    const filtered = ratingFilter ? items.filter((i) => i.rating === ratingFilter) : items;
    return [...filtered].sort((a, b) => (asc ? a.ts - b.ts : b.ts - a.ts));
  }, [items, ratingFilter, asc]);

  const totalPages = pageCount(shown.length, PER_PAGE);
  const current = Math.min(page, totalPages);
  const pageItems = shown.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  function jumpTo(next: number) {
    setPage(next);
    document.getElementById("feedback-list-top")?.scrollIntoView({ behavior: "smooth" });
  }
  function pickRating(n: number) {
    setRatingFilter(n);
    setPage(1);
  }
  function pickSort(next: boolean) {
    setAsc(next);
    setPage(1);
  }

  return (
    <>
      <div
        id="feedback-list-top"
        className="mb-6 flex scroll-mt-24 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => pickRating(0)}
            className={ratingFilter === 0 ? CHIP_ON : CHIP_OFF}
          >
            Tất cả
            <span className="tabular-nums opacity-70">{items.length}</span>
          </button>
          {[5, 4, 3, 2, 1].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => pickRating(ratingFilter === n ? 0 : n)}
              disabled={counts[n] === 0}
              className={`${ratingFilter === n ? CHIP_ON : CHIP_OFF} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {n}
              <Star size={11} aria-hidden className="fill-amber-400 text-amber-400" />
              <span className="tabular-nums opacity-70">{counts[n]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => pickSort(false)}
            className={`h-7 rounded-full px-3 text-[10px] font-black uppercase tracking-wider transition-colors ${
              asc ? "text-neutral-400 hover:text-white" : "bg-white/10 text-white"
            }`}
          >
            Mới nhất
          </button>
          <button
            type="button"
            onClick={() => pickSort(true)}
            className={`h-7 rounded-full px-3 text-[10px] font-black uppercase tracking-wider transition-colors ${
              asc ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Cũ nhất
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-20 text-center">
          <p className="mb-2 text-xl font-black uppercase text-white">
            {ratingFilter ? `Chưa có đánh giá ${ratingFilter} sao` : "Chưa có đánh giá nào"}
          </p>
          <p className="text-sm text-neutral-400">
            {ratingFilter ? "Thử bỏ bộ lọc để xem tất cả." : "Hãy là người đầu tiên để lại đánh giá."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pageItems.map((item, i) => (
            <ReviewCard key={`${item.ts}-${i}`} item={item} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          aria-label="Phân trang"
          className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
        >
          <button
            type="button"
            title="Trang trước"
            disabled={current <= 1}
            onClick={() => jumpTo(current - 1)}
            className={ARROW_BTN}
          >
            <ChevronLeft size={16} />
          </button>
          {pageStrip(current, totalPages).map((p, i) =>
            p === GAP ? (
              <span
                key={`gap-${i}`}
                className="flex h-10 w-10 select-none items-center justify-center text-sm font-bold text-neutral-500"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === current ? "page" : undefined}
                onClick={() => jumpTo(p)}
                className={p === current ? PAGE_ON : PAGE_OFF}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            title="Trang sau"
            disabled={current >= totalPages}
            onClick={() => jumpTo(current + 1)}
            className={ARROW_BTN}
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      ) : null}
    </>
  );
}
