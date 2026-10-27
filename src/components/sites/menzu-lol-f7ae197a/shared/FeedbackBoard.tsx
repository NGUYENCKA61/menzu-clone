"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Funnel,
  Star,
  VenetianMask,
} from "lucide-react";

import { pageCount, PER_PAGE } from "@/lib/paging";
import { sentenceCase, titleCase } from "@/lib/displayCase";

import { ListPager } from "./AccountListChrome";
import { PictureLightbox } from "./PictureGallery";

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
  /** The tool, tier and game an order-backed review is about; null for a
   *  free-form one. */
  purchase: { product: string; tier: string | null; game: string; href: string } | null;
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

/** The service chip beside the name — the shop's accent whatever the service. */
export function ServiceChip({ service, small = false }: { service: string; small?: boolean }) {
  return (
    <span
      className={`${
        small ? "text-[11px] px-1.5 sm:text-[9px]" : "text-[11px] px-2 sm:text-[10px]"
      } font-bold py-0.5 rounded border whitespace-nowrap shrink-0 text-[var(--menzu-accent)] bg-[var(--menzu-accent)]/10 border-[var(--menzu-accent)]/20`}
    >
      {sentenceCase(service)}
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
 * The avatar in the home review cards' thin grey ring, the accent red until
 * 18/10/2026 ("rà soát làm sao cho đồng bộ"). Anonymous reviews get the
 * original's light-grey incognito disc; a signed reviewer without a picture
 * gets their initial.
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
    <div className="relative inline-block shrink-0 rounded-full p-[2px] border border-white/15">
      <div className="w-11 h-11 sm:w-[50px] sm:h-[50px] rounded-full overflow-hidden flex items-center justify-center bg-neutral-800">
        {anonymous ? (
          <div className="w-full h-full bg-[#D1D5DB] flex items-center justify-center">
            <VenetianMask className="w-6 h-6 text-neutral-700 opacity-80" />
          </div>
        ) : avatarUrl ? (
          <Image src={avatarUrl} alt="" width={50} height={50} className="w-full h-full object-cover" />
        ) : (
          <span aria-hidden className="text-base font-semibold text-neutral-400">
            {name.slice(0, 1)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A review's pictures as a row of equal 16:9 thumbnails, each opening the
 * full picture in the gallery's own lightbox.
 *
 * They were drawn at their natural size: a landscape shot took half the
 * page, a portrait one stood ~500px tall, and no two reviews were the same
 * height (the owner, 13/10/2026, UI consistency review). A thumbnail is a
 * crop, so the whole picture is one press away rather than a new tab.
 *
 * Squares at first; 16:9 since the owner's "ảnh nên để card hình chữ nhật"
 * and "rà soát làm sao cho đồng bộ" (18/10/2026): most pictures are 16:9
 * screenshots, and the frame is the one /thong-bao gives the pictures of its
 * status changes: the same rounding, rim and ground, 168px wide from sm. The
 * draft in FeedbackComposer wears it too.
 *
 * Through next/image at quality 95: the stored file is the whole picture
 * (often 100-200KB), and the thumbnail downloads a fraction of it (image
 * audit, 17/10/2026). The lightbox still opens the stored file itself. Lazy,
 * since the wall lists hundreds.
 */
function ReviewPictures({ pictures, reviewer }: { pictures: string[]; reviewer: string }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (pictures.length === 0) return null;

  return (
    <>
      <ul className="mt-4 flex flex-wrap gap-2">
        {pictures.map((src, i) => (
          <li key={`${i}-${src}`}>
            <button
              type="button"
              onClick={() => {
                setIndex(i);
                setOpen(true);
              }}
              aria-label={
                pictures.length > 1 ? `Phóng to ảnh đính kèm ${i + 1}` : "Phóng to ảnh đính kèm"
              }
              className="group/img lab-notch-sm block aspect-video w-36 cursor-zoom-in overflow-hidden border border-line bg-raise transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--menzu-accent)] sm:w-[168px]"
            >
              <Image
                src={src}
                alt=""
                width={168}
                height={95}
                // A 16:9 picture fills the frame without a crop, so the file
                // only needs the frame's own width: a 384px-wide one on a
                // sharp screen. The square needed "320px": it cropped the
                // sides off and blew the rest up, and at "112px" a 256px
                // file read soft (17/10/2026).
                sizes="168px"
                quality={95}
                // A picture from anywhere but this site's own uploads cannot
                // go through the optimizer; it is drawn as it is.
                unoptimized={!src.startsWith("/")}
                className="h-full w-full object-cover transition-transform duration-500 group-hover/img:scale-105 motion-reduce:transition-none"
              />
            </button>
          </li>
        ))}
      </ul>
      <PictureLightbox
        open={open}
        onClose={() => setOpen(false)}
        pictures={pictures}
        index={index}
        onStep={(delta) => setIndex((i) => (i + delta + pictures.length) % pictures.length)}
        alt={`đánh giá của ${reviewer}`}
        plain
      />
    </>
  );
}

/** One full-width review card, matching the captured markup piece for piece. */
function ReviewCard({ item }: { item: FeedbackItem }) {
  return (
    <div className="bg-white/[0.02] border border-white/10 border-neutral-800/60 p-5 sm:p-6 rounded-2xl transition-all hover:bg-neutral-900/70 hover:border-neutral-700/60 relative overflow-hidden">
      <div className="flex gap-4 items-start">
        <ReviewAvatar name={item.name} avatarUrl={item.avatarUrl} anonymous={item.anonymous} />
        <div className="flex-1 min-w-0 pt-0.5">
          {/* The name has the line to itself and the date rides beside the
              stars, as on the home review cards: beside the name, "Khách
              hàng ẩn danh" was cut short on a phone (18/10/2026). */}
          <div className="flex items-center gap-2 flex-wrap min-w-0 mb-1.5">
            <h3 className="text-base font-bold text-white truncate">{item.name}</h3>
            {item.verified ? <VerifiedBadge /> : null}
            <ServiceChip service={item.service} />
          </div>
          <div className="flex items-center gap-2">
            <StarRow rating={item.rating} />
            <span className="text-[11px] text-neutral-500 font-medium">{item.when}</span>
          </div>
          {/* What was bought, under the stars: "Đã mua" and the tool, on one
              line, cut short with an ellipsis when the name runs long (the
              owner, 01/10/2026: "bổ sung thông tin mua key bản gì game gì";
              07/10/2026: "bỏ nhãn 30 ngày và dấu ." → "đã mua hack valorant
              bản ..."). The tier chip and the game after a dot came off: the
              tool's own name already says the game. The name is written as
              the category cards and the home page's reviews write it
              (26/10/2026, lab 3200: "rà soát kỹ đi"). */}
          {item.purchase ? (
            <p className="mt-2 flex min-w-0 items-center gap-1.5 text-[12px] text-neutral-500">
              <span className="shrink-0">Đã mua</span>
              <Link
                href={item.purchase.href}
                className="min-w-0 truncate font-semibold text-neutral-200 transition-colors hover:text-white sm:max-w-[520px]"
              >
                {titleCase(item.purchase.product)}
              </Link>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 pl-[calc(44px+16px)] sm:pl-[calc(54px+16px)]">
        {/* Quoted the home review cards' way, a bar on the left rather
            than curly quotes. */}
        {item.body ? (
          <p className="border-l-2 border-white/10 pl-3 text-neutral-200 leading-relaxed text-[14px] whitespace-pre-wrap">
            {item.body}
          </p>
        ) : (
          <p className="text-neutral-600 text-sm italic">Không để lại nhận xét</p>
        )}

        {item.imageUrl ? (
          <ReviewPictures pictures={[item.imageUrl]} reviewer={item.name} />
        ) : null}

        {/* The amount in white like the shop's other figures (Tổng quan,
            the prices on the cards); green, the captured shop's, until
            18/10/2026 ("Màu trắng chẳng hạn"). */}
        {item.amount > 0 ? (
          <div className="mt-4 sm:mt-0 sm:absolute sm:bottom-6 sm:right-8 text-right flex flex-col items-end">
            <span className="text-[12px] text-neutral-500 font-medium mb-1">
              Trị giá giao dịch
            </span>
            <span className="text-2xl font-black text-white tabular-nums leading-none">
              {formatVnd(item.amount)}đ
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}


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
          className="-m-1.5 rounded p-1.5 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
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
        className={`p-2 sm:p-1.5 rounded-lg transition-all ${
          asc ? "text-neutral-500 hover:text-neutral-300" : "bg-[var(--menzu-accent-dark)] text-white"
        }`}
      >
        <ArrowDownWideNarrow size={18} />
      </button>
      <button
        type="button"
        title="Cũ nhất"
        onClick={() => onChange(true)}
        className={`p-2 sm:p-1.5 rounded-lg transition-all ${
          asc ? "bg-[var(--menzu-accent-dark)] text-white" : "text-neutral-500 hover:text-neutral-300"
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
        <div className="w-full bg-white/[0.02] border border-white/10 border-neutral-800/60 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-2 sm:hidden">
          <div className="flex items-center gap-3 bg-neutral-950/60 border border-neutral-800 px-3.5 py-2 rounded-xl shadow-inner shadow-black/40 shrink-0">
            <div className="flex flex-col mr-1 shrink-0 whitespace-nowrap">
              <span className="text-[12px] font-medium text-neutral-600 leading-none mb-1">
                Lọc theo
              </span>
              <span className="text-[14px] font-semibold text-[var(--menzu-accent)] leading-none">
                Số sao
              </span>
            </div>
            <RatingStars value={ratingFilter} onPick={pickRating} size={18} gap="gap-1.5" />
          </div>
          <SortToggle asc={asc} onChange={pickSort} />
        </div>

        {/* Desktop: label, capsule, sort pushed to the far edge. */}
        <div className="w-full bg-white/[0.02] border border-white/10 border-neutral-800/60 p-4 rounded-2xl hidden sm:flex sm:items-center sm:gap-4">
          <div className="flex items-center gap-2 text-neutral-400 text-[14px] font-semibold mr-2">
            <Funnel size={14} className="text-[var(--menzu-accent)]" />
            <span>Bộ lọc:</span>
          </div>
          <div className="flex items-center gap-4 bg-neutral-950/60 border border-neutral-800 px-5 py-2.5 rounded-2xl shadow-inner shadow-black/40">
            <div className="flex flex-col mr-2">
              <span className="text-[12px] font-medium text-neutral-600 leading-none mb-1">
                Lọc theo
              </span>
              <span className="text-[14px] font-semibold text-[var(--menzu-accent)] leading-none">
                Số sao
              </span>
            </div>
            <RatingStars value={ratingFilter} onPick={pickRating} size={22} gap="gap-2" />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[12px] font-medium text-neutral-500 mr-1">Sắp xếp:</span>
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

      {/* The pager Lịch sử mua, Lịch sử giao dịch and the wiki share (40px,
          10px corners, the open page grey) rather than one of its own in red
          (18/10/2026, "rà soát ... cho đồng bộ"). It draws nothing for a
          single page. */}
      <ListPager page={current - 1} pageCount={totalPages} onSelect={(next) => jumpTo(next + 1)} />
    </>
  );
}
