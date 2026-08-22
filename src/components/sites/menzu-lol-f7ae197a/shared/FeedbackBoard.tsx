"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronLeft,
  ChevronRight,
  Funnel,
  Star,
  VenetianMask,
} from "lucide-react";

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
 * The Facebook-blue "Tài khoản đã xác minh" seal, traced from the original —
 * it is Facebook's own badge glyph, which is the point: the shop borrows a
 * mark shoppers already trust.
 */
export function VerifiedBadge({ size = "w-3.5 h-3.5" }: { size?: string }) {
  return (
    <div className="bg-[#0866FF]/10 p-0.5 rounded-full shrink-0">
      <svg viewBox="0 0 12 13" width="16" height="16" fill="currentColor" className={`${size} text-[#0866FF]`}>
        <title>Tài khoản đã xác minh</title>
        <g fillRule="evenodd" transform="translate(-98 -917)">
          <path d="m106.853 922.354-3.5 3.5a.499.499 0 0 1-.706 0l-1.5-1.5a.5.5 0 1 1 .706-.708l1.147 1.147 3.147-3.147a.5.5 0 1 1 .706.708m3.078 2.295-.589-1.149.588-1.15a.633.633 0 0 0-.219-.82l-1.085-.7-.065-1.287a.627.627 0 0 0-.6.603l-1.29-.066-.703-1.087a.636.636 0 0 0-.82-.217l-1.148.588-1.15-.588a.631.631 0 0 0-.82.22l-.701 1.085-1.289.065a.626.626 0 0 0-.6.6l-.066 1.29-1.088.702a.634.634 0 0 0-.216.82l.588 1.149-.588 1.15a.632.632 0 0 0 .219.819l1.085.701.065 1.286c.014.33.274.59.6.604l1.29.065.703 1.088c.177.27.53.362.82.216l1.148-.588 1.15.589a.629.629 0 0 0 .82-.22l.701-1.085 1.286-.064a.627.627 0 0 0 .604-.601l.065-1.29 1.088-.703a.633.633 0 0 0 .216-.819" />
        </g>
      </svg>
    </div>
  );
}

/** The service chip beside the name — blue whatever the service, as captured. */
export function ServiceChip({ service, small = false }: { service: string; small?: boolean }) {
  return (
    <span
      className={`${
        small ? "text-[9px] px-1.5" : "text-[10px] px-2"
      } font-bold py-0.5 rounded border whitespace-nowrap shrink-0 text-blue-400 bg-blue-500/10 border-blue-500/20`}
    >
      {service}
    </span>
  );
}

/** A row of five stars, the first `rating` lit amber, the rest coal-dark. */
export function StarRow({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-[3px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          className={
            n <= rating
              ? "text-amber-400 fill-amber-400"
              : "text-neutral-800 fill-neutral-900/50"
          }
        />
      ))}
    </div>
  );
}

/**
 * The avatar in its blue ring. Anonymous reviews get the original's light-grey
 * incognito disc; a signed reviewer without a picture gets their initial.
 */
export function ReviewAvatar({
  name,
  avatarUrl,
  anonymous,
}: {
  name: string;
  avatarUrl: string | null;
  anonymous: boolean;
}) {
  return (
    <div className="relative inline-block shrink-0 rounded-full p-[2px] border-[2.5px] border-[#0866FF]">
      <div className="w-11 h-11 sm:w-[50px] sm:h-[50px] rounded-full overflow-hidden flex items-center justify-center bg-neutral-800">
        {anonymous ? (
          <div className="w-full h-full bg-[#D1D5DB] flex items-center justify-center">
            <VenetianMask className="w-6 h-6 text-neutral-700 opacity-80" />
          </div>
        ) : avatarUrl ? (
          <Image src={avatarUrl} alt="" width={50} height={50} className="w-full h-full object-cover" />
        ) : (
          <span aria-hidden className="text-base font-black uppercase text-neutral-400">
            {name.slice(0, 1)}
          </span>
        )}
      </div>
    </div>
  );
}

/** One full-width review card, matching the captured markup piece for piece. */
function ReviewCard({ item }: { item: FeedbackItem }) {
  return (
    <div className="bg-neutral-900/40 border border-neutral-800/60 p-5 sm:p-6 rounded-3xl transition-all hover:bg-neutral-900/70 hover:border-neutral-700/60 relative overflow-hidden">
      <div className="flex gap-4 items-start">
        <ReviewAvatar name={item.name} avatarUrl={item.avatarUrl} anonymous={item.anonymous} />
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3 className="text-base font-black text-white truncate">{item.name}</h3>
              {item.verified ? <VerifiedBadge /> : null}
              <ServiceChip service={item.service} />
            </div>
            <span className="text-[11px] text-neutral-600 font-medium shrink-0 pt-0.5">
              {item.when}
            </span>
          </div>
          <StarRow rating={item.rating} />
        </div>
      </div>

      <div className="mt-4 pl-[calc(44px+16px)] sm:pl-[calc(54px+16px)]">
        {item.body ? (
          <p className="text-neutral-300 leading-relaxed text-[14.5px] whitespace-pre-wrap">
            “{item.body}”
          </p>
        ) : (
          <p className="text-neutral-600 text-sm italic">Không để lại nhận xét</p>
        )}

        {item.imageUrl ? (
          <a
            href={item.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block rounded-2xl overflow-hidden border border-neutral-800 w-fit max-w-2xl cursor-zoom-in hover:border-emerald-500/50 transition-colors group/img"
          >
            {/* Plain img: attachment sizes vary and the file already went
                through sharp on the way in — next/image would re-run it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.imageUrl}
              alt="Ảnh đính kèm"
              className="w-full h-auto object-cover max-h-[500px] group-hover/img:scale-105 transition-transform duration-500"
            />
          </a>
        ) : null}

        {item.amount > 0 ? (
          <div className="mt-4 sm:mt-0 sm:absolute sm:bottom-6 sm:right-8 text-right flex flex-col items-end">
            <span className="text-[10px] text-neutral-500 uppercase font-black tracking-[0.15em] mb-1">
              Trị giá giao dịch
            </span>
            <span className="text-2xl font-black text-emerald-400 tabular-nums leading-none">
              {formatVnd(item.amount)}&nbsp;₫
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const PAGE_BTN =
  "w-10 h-10 rounded-xl text-sm font-black transition-all flex items-center justify-center cursor-pointer active:scale-95";
const PAGE_ON = `${PAGE_BTN} bg-emerald-500 text-black border border-emerald-500 font-extrabold`;
const PAGE_OFF = `${PAGE_BTN} bg-white/5 border border-white/5 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10`;
const ARROW_BTN =
  "w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-neutral-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer active:scale-95 hover:bg-emerald-500/10 hover:text-emerald-400";

/** The star buttons inside the filter capsule, shared by both breakpoints. */
function RatingStars({
  value,
  onPick,
  size,
  gap,
}: {
  value: number;
  onPick: (n: number) => void;
  size: number;
  gap: string;
}) {
  return (
    <div className={`flex ${gap} shrink-0`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          title={`${n} sao`}
          onClick={() => onPick(n === value ? 0 : n)}
          className="transition-all active:scale-90 hover:scale-125"
        >
          <Star
            size={size}
            className={`transition-colors duration-300 ${
              value >= n
                ? "text-amber-400 fill-amber-400"
                : "text-neutral-800 fill-neutral-900/50 hover:text-neutral-700"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

/** The Mới nhất / Cũ nhất pair in its dark pill. */
function SortToggle({ asc, onChange }: { asc: boolean; onChange: (asc: boolean) => void }) {
  return (
    <div className="flex bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden p-1">
      <button
        type="button"
        title="Mới nhất"
        onClick={() => onChange(false)}
        className={`p-1.5 rounded-lg transition-all ${
          asc ? "text-neutral-500 hover:text-neutral-300" : "bg-emerald-500 text-black"
        }`}
      >
        <ArrowDownWideNarrow size={18} />
      </button>
      <button
        type="button"
        title="Cũ nhất"
        onClick={() => onChange(true)}
        className={`p-1.5 rounded-lg transition-all ${
          asc ? "bg-emerald-500 text-black" : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        <ArrowUpNarrowWide size={18} />
      </button>
    </div>
  );
}

/**
 * Everything below the notice bar on /feedback: the filter capsule, the review
 * list and the pagination. Filtering, sorting and paging all happen here in
 * the browser — the page hands over every approved review once.
 */
export function FeedbackBoard({ items }: { items: FeedbackItem[] }) {
  const [ratingFilter, setRatingFilter] = useState(0);
  const [asc, setAsc] = useState(false);
  const [page, setPage] = useState(1);

  const shown = useMemo(() => {
    const filtered = ratingFilter
      ? items.filter((i) => i.rating === ratingFilter)
      : items;
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
      <div id="feedback-list-top" className="w-full scroll-mt-24 mb-8">
        {/* Phone: the capsule and the sort share one row. */}
        <div className="w-full bg-neutral-900/40 border border-neutral-800/60 p-4 rounded-2xl flex items-center justify-between gap-2 sm:hidden">
          <div className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 px-3.5 py-2 rounded-xl shadow-inner shadow-black/40 shrink-0">
            <div className="flex flex-col mr-1 shrink-0 whitespace-nowrap">
              <span className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] leading-none mb-1">
                Lọc theo
              </span>
              <span className="text-xs font-black text-emerald-500 uppercase tracking-widest leading-none">
                Rating
              </span>
            </div>
            <RatingStars value={ratingFilter} onPick={pickRating} size={18} gap="gap-1.5" />
          </div>
          <SortToggle asc={asc} onChange={pickSort} />
        </div>

        {/* Desktop: label, capsule, sort pushed to the far edge. */}
        <div className="w-full bg-neutral-900/40 border border-neutral-800/60 p-4 rounded-2xl hidden sm:flex sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs font-black uppercase tracking-widest mr-2">
            <Funnel size={14} className="text-emerald-500" />
            <span>Bộ lọc:</span>
          </div>
          <div className="flex items-center gap-4 bg-neutral-950/60 border border-neutral-800 px-5 py-2.5 rounded-2xl shadow-inner shadow-black/40">
            <div className="flex flex-col mr-2">
              <span className="text-[9px] font-black text-neutral-600 uppercase tracking-[0.2em] leading-none mb-1">
                Lọc theo
              </span>
              <span className="text-xs font-black text-emerald-500 uppercase tracking-widest leading-none">
                Rating
              </span>
            </div>
            <RatingStars value={ratingFilter} onPick={pickRating} size={22} gap="gap-2" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-black text-neutral-500 uppercase mr-1">Sắp xếp:</span>
            <SortToggle asc={asc} onChange={pickSort} />
          </div>
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="w-full flex flex-col items-center justify-center py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <p className="text-xl font-bold text-white mb-2">
            {ratingFilter ? `CHƯA CÓ ĐÁNH GIÁ ${ratingFilter} SAO` : "CHƯA CÓ ĐÁNH GIÁ NÀO"}
          </p>
          <p className="text-neutral-400">
            {ratingFilter
              ? "Thử bỏ bộ lọc để xem tất cả đánh giá."
              : "Hãy là người đầu tiên để lại đánh giá."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pageItems.map((item, i) => (
            <ReviewCard key={`${item.ts}-${i}`} item={item} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center mt-10">
          <nav className="isolate inline-flex rounded-xl gap-1.5 items-center justify-center" aria-label="Phân trang">
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
                  className="w-10 h-10 flex items-center justify-center text-neutral-500 text-sm font-bold select-none"
                >
                  ...
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
        </div>
      ) : null}
    </>
  );
}
